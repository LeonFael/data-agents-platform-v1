"""
Conexión a la base de datos PostgreSQL.
Railway inyecta DATABASE_URL automáticamente cuando enlazas el plugin Postgres.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Railway entrega postgresql:// — SQLAlchemy 2.x requiere postgresql+psycopg2://
db_url = settings.database_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency de FastAPI: una sesión de DB por request, cerrada al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Crea las tablas si no existen. Se llama una vez al arrancar la app."""
    from app.models import db_models  # noqa: F401 — registra los modelos en Base
    Base.metadata.create_all(bind=engine)
