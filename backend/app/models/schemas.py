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
