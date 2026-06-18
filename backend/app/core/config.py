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

