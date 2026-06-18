import os
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import get_settings
from app.models.schemas import AnalysisResponse, ChatRequest, ChatResponse
from app.orchestrator.pipeline import run_analysis_pipeline
from app.services.llm_client import get_llm_client

router = APIRouter()
settings = get_settings()


# ── Health check ──────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "version": settings.app_version}


@router.get("/llm-status")
def llm_status():
    """Diagnóstico rápido: qué proveedor está configurado y si la key existe."""
    provider = settings.llm_provider.lower()
    has_key = (
        bool(settings.anthropic_api_key) if provider == "claude"
        else bool(settings.gemini_api_key) if provider == "gemini"
        else False
    )
    return {
        "provider": provider,
        "configured": has_key,
        "claude_key_set": bool(settings.anthropic_api_key),
        "gemini_key_set": bool(settings.gemini_api_key),
    }


# ── Upload y análisis ─────────────────────────────────────────────────────────

@router.post("/upload", response_model=AnalysisResponse)
async def upload_file(file: UploadFile = File(...)):
    # Validar extensión
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Formato '{ext}' no soportado. Usa: {', '.join(settings.allowed_extensions)}",
        )

    # Validar tamaño (leer en memoria para revisar antes de guardar)
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo demasiado grande ({size_mb:.1f} MB). Máximo: {settings.max_file_size_mb} MB",
        )

    # Guardar en archivo temporal
    os.makedirs(settings.upload_dir, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=ext,
        dir=settings.upload_dir,
    ) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = run_analysis_pipeline(tmp_path, file.filename)
        return result
    finally:
        # Limpiar archivo temporal siempre
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── Chat con el agente ────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        client = get_llm_client()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Construir contexto del dataset para el prompt
    s = request.dataset_summary
    col_lines = "\n".join(
        f"  - {c.name} ({'numérica' if c.is_numeric else 'categórica'}): "
        f"{c.missing} nulos ({c.missing_pct}%)"
        for c in s.column_info
    )
    stats_lines = "\n".join(
        f"  - {name}: media={st.mean}, std={st.std}, min={st.min}, max={st.max}"
        for name, st in s.numeric_stats.items()
    )

    system_prompt = f"""Eres un analista de datos experto. Responde preguntas sobre el dataset del usuario.

DATASET: {s.file_name} ({s.rows} filas × {s.columns} columnas)
Completitud: {s.completeness_pct}%
Columnas numéricas: {s.numeric_cols} | Categóricas: {s.categorical_cols}

COLUMNAS:
{col_lines}

ESTADÍSTICAS NUMÉRICAS:
{stats_lines if stats_lines else "  (sin columnas numéricas)"}

REGLAS:
- Responde siempre en español
- Sé específico con números del dataset
- Máximo 3-4 oraciones por respuesta
- Si no puedes responder con los datos disponibles, dilo claramente"""

    # Convertir historial
    messages = [
        {"role": m.role, "content": m.content}
        for m in request.history
    ] + [{"role": "user", "content": request.message}]

    try:
        reply = client.generate(system_prompt, messages, max_tokens=600)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error del proveedor LLM: {str(e)}")

    # Sugerencias contextuales simples
    suggestions = _build_suggestions(request.message, s)

    return ChatResponse(reply=reply, suggestions=suggestions)


def _build_suggestions(last_message: str, summary) -> list[str]:
    """Genera sugerencias de seguimiento según el contexto."""
    base = [
        "¿Cuáles son los valores más frecuentes?",
        "¿Qué columna tiene más valores nulos?",
        "Dame un resumen ejecutivo",
        "¿Hay outliers en los datos?",
    ]
    if summary.numeric_cols > 0:
        base.append("¿Hay correlación entre las variables numéricas?")
    if summary.categorical_cols > 0:
        base.append("¿Cuál es la distribución de las categorías?")
    # Rotar para no mostrar siempre los mismos
    return base[:3]
