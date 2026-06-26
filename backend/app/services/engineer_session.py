"""
Sesiones del Agente Ingeniero — almacenamiento en memoria del proceso.

Por qué en memoria y no en DB: el DataFrame completo puede ser pesado
para serializar en cada paso, y las transformaciones son interactivas
(el usuario aprueba una por una). Una sesión vive mientras el usuario
está limpiando ese dataset; se descarta cuando termina o expira.

Limitación conocida: si Railway reinicia el proceso, las sesiones activas
se pierden. Aceptable para v1 — en v2 esto migra a Redis si hace falta
escalar a múltiples workers.
"""
import time
import uuid

import pandas as pd

SESSION_TTL_SECONDS = 60 * 30   # 30 minutos de inactividad → se purga

_sessions: dict[str, dict] = {}


def create_session(df: pd.DataFrame, file_name: str) -> str:
    session_id = str(uuid.uuid4())[:12]
    _sessions[session_id] = {
        "df": df,
        "original_df": df.copy(),     # para poder reiniciar desde cero si se desea
        "file_name": file_name,
        "history": [],                 # [{action, suggestion_id, detail, df_snapshot}]
        "last_access": time.time(),
    }
    return session_id


def get_session(session_id: str) -> dict | None:
    _purge_expired()
    session = _sessions.get(session_id)
    if session:
        session["last_access"] = time.time()
    return session


def update_dataframe(session_id: str, new_df: pd.DataFrame, log_entry: dict) -> None:
    session = _sessions.get(session_id)
    if session is None:
        raise KeyError(f"Sesión '{session_id}' no encontrada o expirada.")
    # Guardar snapshot ANTES del cambio para poder deshacer
    log_entry["df_snapshot_before"] = session["df"].copy()
    session["history"].append(log_entry)
    session["df"] = new_df
    session["last_access"] = time.time()


def undo_last_action(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if session is None:
        raise KeyError(f"Sesión '{session_id}' no encontrada o expirada.")
    if not session["history"]:
        raise ValueError("No hay transformaciones para deshacer.")
    last = session["history"].pop()
    session["df"] = last["df_snapshot_before"]
    session["last_access"] = time.time()
    return last


def delete_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def _purge_expired() -> None:
    now = time.time()
    expired = [sid for sid, s in _sessions.items() if now - s["last_access"] > SESSION_TTL_SECONDS]
    for sid in expired:
        _sessions.pop(sid, None)
