import io
import os
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.agents.engineer import apply_action, find_suggestion, generate_suggestions, summarize
from app.core.config import get_settings
from app.models.schemas import (
    ApplyActionRequest,
    ApplyActionResponse,
    EngineerExportRequest,
    StartEngineerSessionResponse,
    UndoRequest,
)
from app.services.engineer_session import (
    create_session,
    delete_session,
    get_session,
    undo_last_action,
    update_dataframe,
)
from app.services.file_router import route_file

router = APIRouter(prefix="/engineer", tags=["engineer"])
settings = get_settings()


@router.post("/start", response_model=StartEngineerSessionResponse)
async def start_session(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Formato '{ext}' no soportado. Usa: {', '.join(settings.allowed_extensions)}",
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(status_code=413, detail=f"Archivo demasiado grande ({size_mb:.1f} MB).")

    os.makedirs(settings.upload_dir, exist_ok=True)
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=settings.upload_dir) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        df = route_file(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    session_id = create_session(df, file.filename)
    suggestions = generate_suggestions(df)
    summary = summarize(df, file.filename)

    return StartEngineerSessionResponse(
        session_id=session_id,
        summary=summary,
        suggestions=suggestions,
    )


@router.post("/apply", response_model=ApplyActionResponse)
def apply(request: ApplyActionRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada. Vuelve a subir el archivo.")

    df = session["df"]
    suggestions = generate_suggestions(df)
    suggestion = find_suggestion(suggestions, request.suggestion_id)
    if suggestion is None:
        raise HTTPException(status_code=404, detail=f"Sugerencia '{request.suggestion_id}' no encontrada.")

    if request.action not in suggestion.available_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Acción '{request.action}' no es válida para esta sugerencia. "
                   f"Opciones: {', '.join(suggestion.available_actions)}",
        )

    summary_before = summarize(df, session["file_name"])

    try:
        new_df, detail = apply_action(df, suggestion, request.action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    log_entry = {
        "suggestion_id": request.suggestion_id,
        "action": request.action,
        "detail": detail,
    }
    update_dataframe(request.session_id, new_df, log_entry)

    summary_after = summarize(new_df, session["file_name"])
    remaining = generate_suggestions(new_df)

    applied_log = [
        {"suggestion_id": h["suggestion_id"], "action": h["action"], "detail": h["detail"]}
        for h in session["history"]
    ]

    return ApplyActionResponse(
        session_id=request.session_id,
        applied=detail,
        summary_before=summary_before,
        summary_after=summary_after,
        remaining_suggestions=remaining,
        applied_log=applied_log,
    )


@router.post("/undo", response_model=ApplyActionResponse)
def undo(request: UndoRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada.")

    df_before_undo = session["df"]
    summary_before = summarize(df_before_undo, session["file_name"])

    try:
        undone = undo_last_action(request.session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    new_df = session["df"]
    summary_after = summarize(new_df, session["file_name"])
    remaining = generate_suggestions(new_df)

    applied_log = [
        {"suggestion_id": h["suggestion_id"], "action": h["action"], "detail": h["detail"]}
        for h in session["history"]
    ]

    return ApplyActionResponse(
        session_id=request.session_id,
        applied={"action": "undo", "column": None, "rows_affected": 0,
                 "note": f"Se revirtió: {undone['detail']['note']}"},
        summary_before=summary_before,
        summary_after=summary_after,
        remaining_suggestions=remaining,
        applied_log=applied_log,
    )


@router.get("/session/{session_id}/suggestions")
def get_suggestions(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada.")
    return generate_suggestions(session["df"])


@router.post("/export")
def export(request: EngineerExportRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada.")

    df = session["df"]
    base_name = os.path.splitext(session["file_name"])[0]

    if request.format == "csv":
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={base_name}_limpio.csv"},
        )

    if request.format == "xlsx":
        buf = io.BytesIO()
        df.to_excel(buf, index=False, engine="openpyxl")
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={base_name}_limpio.xlsx"},
        )

    raise HTTPException(status_code=400, detail="Formato debe ser 'csv' o 'xlsx'.")


@router.get("/export/{session_id}/code")
def export_code(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada.")

    code_lines = [
        "import pandas as pd",
        "",
        "# Código generado automáticamente — Agente Ingeniero de Datos",
        f"# Archivo original: {session['file_name']}",
        "",
        f"df = pd.read_csv('{session['file_name']}')  # ajusta la ruta si es necesario",
        "",
    ]

    for h in session["history"]:
        action = h["action"]
        col = h["detail"].get("column")
        note = h["detail"].get("note", "")
        code_lines.append(f"# {note}")

        if action == "drop_rows" and col:
            code_lines.append(f"df = df.dropna(subset=['{col}'])")
        elif action == "drop_column":
            code_lines.append(f"df = df.drop(columns=['{col}'])")
        elif action == "impute_mean":
            code_lines.append(f"df['{col}'] = pd.to_numeric(df['{col}'], errors='coerce')")
            code_lines.append(f"df['{col}'] = df['{col}'].fillna(df['{col}'].mean())")
        elif action == "impute_median":
            code_lines.append(f"df['{col}'] = pd.to_numeric(df['{col}'], errors='coerce')")
            code_lines.append(f"df['{col}'] = df['{col}'].fillna(df['{col}'].median())")
        elif action == "impute_mode":
            code_lines.append(f"df['{col}'] = df['{col}'].fillna(df['{col}'].mode().iloc[0])")
        elif action == "drop_duplicates":
            code_lines.append("df = df.drop_duplicates()")
        elif action == "cap_outliers":
            code_lines.append(f"q1, q3 = df['{col}'].quantile(0.25), df['{col}'].quantile(0.75)")
            code_lines.append("iqr = q3 - q1")
            code_lines.append(f"df['{col}'] = df['{col}'].clip(lower=q1 - 1.5*iqr, upper=q3 + 1.5*iqr)")
        code_lines.append("")

    code_lines.append("df.to_csv('dataset_limpio.csv', index=False)")
    code = "\n".join(code_lines)

    return StreamingResponse(
        iter([code]),
        media_type="text/x-python",
        headers={"Content-Disposition": "attachment; filename=limpieza_datos.py"},
    )


@router.delete("/session/{session_id}")
def close_session(session_id: str):
    delete_session(session_id)
    return {"status": "closed"}
