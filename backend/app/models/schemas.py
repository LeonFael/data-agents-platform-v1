from pydantic import BaseModel
from typing import Any
from enum import Enum


class FileType(str, Enum):
    csv = "csv"
    excel = "excel"
    json = "json"


class ColumnInfo(BaseModel):
    name: str
    dtype: str
    missing: int
    missing_pct: float
    is_numeric: bool
    unique_count: int


class NumericStats(BaseModel):
    mean: float
    std: float
    min: float
    max: float
    q25: float
    median: float
    q75: float


class DatasetSummary(BaseModel):
    rows: int
    columns: int
    file_name: str
    file_type: str
    size_kb: float
    completeness_pct: float
    numeric_cols: int
    categorical_cols: int
    column_info: list[ColumnInfo]
    numeric_stats: dict[str, NumericStats]
    top_values: dict[str, list[dict[str, Any]]]
    insights: list[dict[str, str]]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    dataset_summary: DatasetSummary
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []


class AnalysisResponse(BaseModel):
    job_id: str
    status: str
    summary: DatasetSummary | None = None
    error: str | None = None


# ── Multi-archivo ─────────────────────────────────────────────────────────────

class FileResult(BaseModel):
    """Resultado individual de un archivo dentro de un batch."""
    file_name: str
    status: str                     # "completed" | "failed"
    summary: DatasetSummary | None = None
    error: str | None = None


class CombineCheckResponse(BaseModel):
    """Respuesta al verificar si varios archivos son combinables."""
    combinable: bool
    reason: str
    shared_columns: list[str] = []
    column_diff: dict[str, list[str]] = {}   # {file_name: [columnas_unicas]}


class BatchAnalysisResponse(BaseModel):
    """Resultado de subir varios archivos a la vez."""
    job_id: str
    mode: str                       # "separate" | "combined"
    files: list[FileResult]         # siempre presente en modo "separate"
    combined_summary: DatasetSummary | None = None   # solo si mode == "combined"
    combine_check: CombineCheckResponse | None = None


# ── Autenticación ─────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    full_name: str | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class HistoryItem(BaseModel):
    id: str
    file_name: str
    file_type: str | None = None
    rows: int | None = None
    columns: int | None = None
    created_at: str

    model_config = {"from_attributes": True}


# ── Agente Ingeniero de Datos ──────────────────────────────────────────────────

class CleaningSuggestion(BaseModel):
    """Una sugerencia de transformación que el agente propone, sin aplicar todavía."""
    id: str                          # identificador único de la sugerencia (ej. "nulls_edad")
    category: str                    # "nulls" | "duplicates" | "outliers"
    column: str | None = None        # None si aplica a todo el dataset (ej. duplicados)
    title: str                       # ej. "12% de nulos en 'edad'"
    description: str                 # explicación en lenguaje natural de por qué se sugiere
    recommended_action: str          # ej. "impute_median", "drop_rows", "drop_column"
    available_actions: list[str]     # todas las acciones que el usuario puede elegir
    severity: str                    # "low" | "medium" | "high"
    affected_rows: int


class StartEngineerSessionResponse(BaseModel):
    session_id: str
    summary: DatasetSummary
    suggestions: list[CleaningSuggestion]


class ApplyActionRequest(BaseModel):
    session_id: str
    suggestion_id: str
    action: str                      # una de las available_actions de esa sugerencia


class ApplyActionResponse(BaseModel):
    session_id: str
    applied: dict                    # detalle de qué se hizo y su efecto (filas afectadas, etc.)
    summary_before: DatasetSummary
    summary_after: DatasetSummary
    remaining_suggestions: list[CleaningSuggestion]
    applied_log: list[dict]          # historial acumulado de transformaciones en esta sesión


class UndoRequest(BaseModel):
    session_id: str


class EngineerExportRequest(BaseModel):
    session_id: str
    format: str = "csv"              # "csv" | "xlsx"
