import json
import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.db_models import AnalysisHistory, User
from app.models.schemas import (
    AnalysisResponse,
    BatchAnalysisResponse,
    ChatRequest,
    ChatResponse,
    HistoryItem,
)
from app.orchestrator.pipeline import run_analysis_pipeline, run_batch_pipeline
from app.services.auth_dependencies import get_current_user, get_current_user_optional
from app.services.llm_client import get_llm_client

router = APIRouter()
settings = get_settings()


@router.get("/health")
def health():
    return {"status": "ok", "version": settings.app_version}


@router.get("/llm-status")
def llm_status():
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


# ── Helper: guardar en historial si hay usuario logueado ─────────────────────

def _save_to_history(db: Session, user: User | None, summary) -> None:
    if user is None or summary is None:
        return
    entry = AnalysisHistory(
        user_id=user.id,
        file_name=summary.file_name,
        file_type=summary.file_type,
        rows=summary.rows,
        columns=summary.columns,
        summary_json=summary.model_dump_json(),
    )
    db.add(entry)
    db.commit()


# ── Upload y análisis ─────────────────────────────────────────────────────────

@router.post("/upload", response_model=AnalysisResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Formato '{ext}' no soportado. Usa: {', '.join(settings.allowed_extensions)}",
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo demasiado grande ({size_mb:.1f} MB). Máximo: {settings.max_file_size_mb} MB",
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        delete=False, suffix=ext, dir=settings.upload_dir,
    ) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = run_analysis_pipeline(tmp_path, file.filename)
        if result.status == "completed":
            _save_to_history(db, current_user, result.summary)
        return result
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/upload-batch", response_model=BatchAnalysisResponse)
async def upload_batch(
    files: list[UploadFile] = File(...),
    mode: str = Form("separate"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    if len(files) < 1:
        raise HTTPException(status_code=400, detail="No se recibieron archivos.")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Máximo 10 archivos por lote.")
    if mode not in ("separate", "combined"):
        raise HTTPException(status_code=400, detail="mode debe ser 'separate' o 'combined'.")

    os.makedirs(settings.upload_dir, exist_ok=True)
    tmp_paths: dict[str, str] = {}

    try:
        for f in files:
            ext = os.path.splitext(f.filename)[-1].lower()
            if ext not in settings.allowed_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{f.filename}': formato '{ext}' no soportado. "
                           f"Usa: {', '.join(settings.allowed_extensions)}",
                )

            content = await f.read()
            size_mb = len(content) / (1024 * 1024)
            if size_mb > settings.max_file_size_mb:
                raise HTTPException(
                    status_code=413,
                    detail=f"'{f.filename}' supera {settings.max_file_size_mb} MB.",
                )

            with tempfile.NamedTemporaryFile(
                delete=False, suffix=ext, dir=settings.upload_dir,
            ) as tmp:
                tmp.write(content)
                tmp_paths[f.filename] = tmp.name

        result = run_batch_pipeline(tmp_paths, mode=mode)

        if result.mode == "combined" and result.combined_summary:
            _save_to_history(db, current_user, result.combined_summary)
        else:
            for file_result in result.files:
                if file_result.status == "completed":
                    _save_to_history(db, current_user, file_result.summary)

        return result

    finally:
        for path in tmp_paths.values():
            if os.path.exists(path):
                os.unlink(path)


# ── Historial ─────────────────────────────────────────────────────────────────

@router.get("/history", response_model=list[HistoryItem])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
):
    rows = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.user_id == current_user.id)
        .order_by(AnalysisHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        HistoryItem(
            id=r.id,
            file_name=r.file_name,
            file_type=r.file_type,
            rows=r.rows,
            columns=r.columns,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.get("/history/{history_id}")
def get_history_detail(
    history_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.id == history_id, AnalysisHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Análisis no encontrado.")
    return json.loads(entry.summary_json)


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        client = get_llm_client()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

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

    messages = [
        {"role": m.role, "content": m.content}
        for m in request.history
    ] + [{"role": "user", "content": request.message}]

    try:
        reply = client.generate(system_prompt, messages, max_tokens=600)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error del proveedor LLM: {str(e)}")

    suggestions = _build_suggestions(request.message, s)

    return ChatResponse(reply=reply, suggestions=suggestions)


def _build_suggestions(last_message: str, summary) -> list[str]:
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
    return base[:3]
