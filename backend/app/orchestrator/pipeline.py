"""
Orquestador v1 — pipeline simple: FileRouter → Agente Analista

En v2 introduciremos LangGraph para routing multi-agente.
Por ahora el orquestador decide con lógica directa para mantenerlo
entendible mientras aprendemos la arquitectura.
"""
import os
import uuid

import pandas as pd

from app.agents.analyst import analyze
from app.models.schemas import (
    AnalysisResponse,
    BatchAnalysisResponse,
    CombineCheckResponse,
    DatasetSummary,
    FileResult,
)
from app.services.file_router import route_file


def run_analysis_pipeline(file_path: str, file_name: str) -> AnalysisResponse:
    """
    Pipeline principal de análisis — un solo archivo.
    Entrada : ruta del archivo en disco + nombre original
    Salida  : AnalysisResponse con el resumen completo o un error descriptivo
    """
    job_id = str(uuid.uuid4())[:8]

    try:
        df = route_file(file_path)
        file_size = os.path.getsize(file_path)
        summary: DatasetSummary = analyze(df, file_name, file_size)

        return AnalysisResponse(job_id=job_id, status="completed", summary=summary)

    except ValueError as e:
        return AnalysisResponse(job_id=job_id, status="failed", error=str(e))
    except Exception as e:
        return AnalysisResponse(
            job_id=job_id,
            status="failed",
            error=f"Error interno al procesar el archivo: {str(e)}",
        )


# ── Multi-archivo ─────────────────────────────────────────────────────────────

# Umbral: cuánta proporción de columnas debe coincidir para considerar
# dos datasets "combinables". 0.6 = al menos 60% de columnas en común.
COMBINE_THRESHOLD = 0.6


def check_combinable(dataframes: dict[str, pd.DataFrame]) -> CombineCheckResponse:
    """
    Decide si un conjunto de DataFrames puede combinarse en uno solo.
    Regla: deben compartir un porcentaje alto de nombres de columna.
    """
    if len(dataframes) < 2:
        return CombineCheckResponse(combinable=False, reason="Se necesita más de un archivo.")

    col_sets = {name: set(df.columns) for name, df in dataframes.items()}
    all_cols = set.union(*col_sets.values())
    shared = set.intersection(*col_sets.values())

    overlap_ratio = len(shared) / len(all_cols) if all_cols else 0
    combinable = overlap_ratio >= COMBINE_THRESHOLD

    diff = {
        name: sorted(cols - shared)
        for name, cols in col_sets.items()
        if cols - shared
    }

    if combinable:
        reason = (
            f"Los archivos comparten {len(shared)} de {len(all_cols)} columnas "
            f"({overlap_ratio:.0%}). Se pueden combinar en un solo dataset."
        )
    else:
        reason = (
            f"Los archivos solo comparten {len(shared)} de {len(all_cols)} columnas "
            f"({overlap_ratio:.0%}). Estructuras muy distintas para combinar de forma fiable."
        )

    return CombineCheckResponse(
        combinable=combinable,
        reason=reason,
        shared_columns=sorted(shared),
        column_diff=diff,
    )


def combine_dataframes(dataframes: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Combina varios DataFrames por columnas compartidas (concatenación vertical).
    Añade una columna __source_file__ para rastrear el origen de cada fila.
    """
    parts = []
    for name, df in dataframes.items():
        part = df.copy()
        part["__source_file__"] = name
        parts.append(part)
    return pd.concat(parts, ignore_index=True, sort=False)


def run_batch_pipeline(
    file_paths: dict[str, str],
    mode: str = "separate",
) -> BatchAnalysisResponse:
    """
    Pipeline para múltiples archivos.

    file_paths : {nombre_original: ruta_en_disco}
    mode       : "separate" analiza cada archivo de forma independiente
                 "combined" intenta unirlos en un solo análisis

    En modo "combined", si los archivos no son combinables, se hace
    fallback automático a "separate" y se informa por qué.
    """
    job_id = str(uuid.uuid4())[:8]
    file_results: list[FileResult] = []
    dataframes: dict[str, pd.DataFrame] = {}

    # 1. Parsear todos los archivos primero (necesario para chequear combinabilidad)
    for file_name, path in file_paths.items():
        try:
            df = route_file(path)
            dataframes[file_name] = df
        except ValueError as e:
            file_results.append(FileResult(file_name=file_name, status="failed", error=str(e)))
        except Exception as e:
            file_results.append(FileResult(
                file_name=file_name, status="failed",
                error=f"Error interno: {str(e)}",
            ))

    # Si no se pudo parsear ningún archivo, terminamos aquí
    if not dataframes:
        return BatchAnalysisResponse(job_id=job_id, mode="separate", files=file_results)

    combine_check = check_combinable(dataframes) if len(dataframes) > 1 else None

    # 2. Modo combinado solicitado
    if mode == "combined":
        if combine_check and combine_check.combinable:
            combined_df = combine_dataframes(dataframes)
            total_size = sum(os.path.getsize(file_paths[n]) for n in dataframes)
            combined_name = f"combinado_{len(dataframes)}_archivos.csv"
            combined_summary = analyze(combined_df, combined_name, total_size)

            return BatchAnalysisResponse(
                job_id=job_id,
                mode="combined",
                files=file_results,
                combined_summary=combined_summary,
                combine_check=combine_check,
            )
        # Fallback: no combinable → analizar por separado e informar por qué
        mode = "separate"

    # 3. Modo separado — un DatasetSummary por archivo
    for file_name, df in dataframes.items():
        try:
            file_size = os.path.getsize(file_paths[file_name])
            summary = analyze(df, file_name, file_size)
            file_results.append(FileResult(file_name=file_name, status="completed", summary=summary))
        except Exception as e:
            file_results.append(FileResult(
                file_name=file_name, status="failed",
                error=f"Error al analizar: {str(e)}",
            ))

    return BatchAnalysisResponse(
        job_id=job_id,
        mode="separate",
        files=file_results,
        combine_check=combine_check,
    )
