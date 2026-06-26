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
    file_name: str
    status: str
    summary: DatasetSummary | None = None
    error: str | None = None


class CombineCheckResponse(BaseModel):
    combinable: bool
    reason: str
    shared_columns: list[str] = []
    column_diff: dict[str, list[str]] = {}


class BatchAnalysisResponse(BaseModel):
    job_id: str
    mode: str
    files: list[FileResult]
    combined_summary: DatasetSummary | None = None
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
    id: str
    category: str
    column: str | None = None
    title: str
    description: str
    recommended_action: str
    available_actions: list[str]
    severity: str
    affected_rows: int


class StartEngineerSessionResponse(BaseModel):
    session_id: str
    summary: DatasetSummary
    suggestions: list[CleaningSuggestion]


class ApplyActionRequest(BaseModel):
    session_id: str
    suggestion_id: str
    action: str


class ApplyActionResponse(BaseModel):
    session_id: str
    applied: dict
    summary_before: DatasetSummary
    summary_after: DatasetSummary
    remaining_suggestions: list[CleaningSuggestion]
    applied_log: list[dict]


class UndoRequest(BaseModel):
    session_id: str


class EngineerExportRequest(BaseModel):
    session_id: str
    format: str = "csv"
