"""
Modelos de base de datos (SQLAlchemy ORM).
Separados de schemas.py (que son los modelos Pydantic de la API).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    analyses = relationship("AnalysisHistory", back_populates="user", cascade="all, delete-orphan")


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    file_name = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=True)
    rows = Column(Integer, nullable=True)
    columns = Column(Integer, nullable=True)
    summary_json = Column(Text, nullable=True)   # DatasetSummary serializado completo
    created_at = Column(DateTime, default=utcnow, index=True)

    user = relationship("User", back_populates="analyses")
