"""
Orquestador v1 — pipeline simple: FileRouter → Agente Analista

En v2 introduciremos LangGraph para routing multi-agente.
Por ahora el orquestador decide con lógica directa para mantenerlo
entendible mientras aprendemos la arquitectura.
"""
import os
import uuid

from app.agents.analyst import analyze
from app.models.schemas import AnalysisResponse, DatasetSummary
from app.services.file_router import route_file


def run_analysis_pipeline(file_path: str, file_name: str) -> AnalysisResponse:
    """
    Pipeline principal de análisis.
    Entrada : ruta del archivo en disco + nombre original
    Salida  : AnalysisResponse con el resumen completo o un error descriptivo
    """
    job_id = str(uuid.uuid4())[:8]

    try:
        # 1. Parsear archivo → DataFrame unificado
        df = route_file(file_path)

        # 2. Agente analista → DatasetSummary
        file_size = os.path.getsize(file_path)
        summary: DatasetSummary = analyze(df, file_name, file_size)

        return AnalysisResponse(
            job_id=job_id,
            status="completed",
            summary=summary,
        )

    except ValueError as e:
        # Errores de negocio (formato no soportado, archivo vacío, etc.)
        return AnalysisResponse(
            job_id=job_id,
            status="failed",
            error=str(e),
        )
    except Exception as e:
        # Errores inesperados — loguear en producción
        return AnalysisResponse(
            job_id=job_id,
            status="failed",
            error=f"Error interno al procesar el archivo: {str(e)}",
        )
