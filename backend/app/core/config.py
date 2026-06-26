from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Data Agents Platform"
    app_version: str = "1.0.0"
    debug: bool = True

    # LLM — proveedor activo: "claude" o "gemini"
    llm_provider: str = "gemini"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    # Base de datos — Railway inyecta esta variable al enlazar el plugin Postgres
    database_url: str = "sqlite:///./local_dev.db"   # fallback para desarrollo sin Postgres

    # Auth — IMPORTANTE: define JWT_SECRET en producción (Railway).
    # Este default fijo es SOLO para desarrollo local sin .env configurado.
    jwt_secret: str = "dev-only-secret-CHANGE-IN-PRODUCTION-via-env-var"

    # Archivos
    max_file_size_mb: int = 50
    upload_dir: str = "/tmp/data_agents_uploads"
    allowed_extensions: list[str] = [".csv", ".xlsx", ".xls", ".json"]

    # CORS
    frontend_url: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
