import numpy as np
import pandas as pd

from app.models.schemas import (
    ColumnInfo,
    DatasetSummary,
    NumericStats,
)


# ── Helpers internos ──────────────────────────────────────────────────────────

def _detect_outliers_iqr(series: pd.Series) -> int:
    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    return int(((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum())


def _safe_float(val) -> float:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return 0.0
    return round(float(val), 4)


# ── Análisis de columnas ──────────────────────────────────────────────────────

def _analyze_columns(df: pd.DataFrame) -> list[ColumnInfo]:
    infos = []
    for col in df.columns:
        series = df[col]
        non_null = series.dropna()
        numeric_vals = pd.to_numeric(non_null, errors="coerce").dropna()
        is_numeric = len(numeric_vals) > len(non_null) * 0.7

        infos.append(ColumnInfo(
            name=col,
            dtype=str(series.dtype),
            missing=int(series.isna().sum()),
            missing_pct=round(series.isna().mean() * 100, 2),
            is_numeric=is_numeric,
            unique_count=int(series.nunique()),
        ))
    return infos


def _numeric_stats(df: pd.DataFrame, col_infos: list[ColumnInfo]) -> dict[str, NumericStats]:
    stats = {}
    for col in col_infos:
        if not col.is_numeric:
            continue
        series = pd.to_numeric(df[col.name], errors="coerce").dropna()
        if len(series) < 2:
            continue
        stats[col.name] = NumericStats(
            mean=_safe_float(series.mean()),
            std=_safe_float(series.std()),
            min=_safe_float(series.min()),
            max=_safe_float(series.max()),
            q25=_safe_float(series.quantile(0.25)),
            median=_safe_float(series.median()),
            q75=_safe_float(series.quantile(0.75)),
        )
    return stats


def _top_values(df: pd.DataFrame, col_infos: list[ColumnInfo]) -> dict[str, list[dict]]:
    top = {}
    for col in col_infos:
        if col.is_numeric:
            continue
        freq = df[col.name].value_counts().head(5)
        top[col.name] = [
            {"value": str(k), "count": int(v), "pct": round(v / len(df) * 100, 1)}
            for k, v in freq.items()
        ]
    return top


# ── Generación de insights ────────────────────────────────────────────────────

def _generate_insights(
    df: pd.DataFrame,
    col_infos: list[ColumnInfo],
    numeric_stats: dict[str, NumericStats],
) -> list[dict[str, str]]:
    insights = []

    # Nulos críticos
    for col in col_infos:
        if col.missing_pct > 30:
            insights.append({
                "type": "warning",
                "title": "Alta tasa de nulos",
                "detail": f'"{col.name}" tiene {col.missing_pct}% de valores nulos. Considera imputación o eliminar la columna.',
            })
        elif col.missing_pct > 0:
            insights.append({
                "type": "info",
                "title": "Valores faltantes",
                "detail": f'"{col.name}" tiene {col.missing} nulos ({col.missing_pct}%). Impacto bajo.',
            })

    # Outliers y variabilidad
    for name, st in numeric_stats.items():
        if st.std == 0:
            insights.append({
                "type": "warning",
                "title": "Sin variabilidad",
                "detail": f'"{name}" tiene desviación estándar 0 — todos los valores son iguales.',
            })
            continue
        cv = abs(st.std / st.mean) if st.mean != 0 else 0
        if cv > 1.5:
            insights.append({
                "type": "warning",
                "title": "Alta dispersión",
                "detail": f'"{name}" tiene CV={round(cv, 2)}. Posibles outliers o datos muy dispersos.',
            })
        series = pd.to_numeric(df[name], errors="coerce").dropna()
        n_out = _detect_outliers_iqr(series)
        if n_out > 0:
            insights.append({
                "type": "info",
                "title": "Outliers detectados",
                "detail": f'"{name}" tiene {n_out} valores atípicos (método IQR).',
            })

    # Columnas ID potenciales
    for col in col_infos:
        if col.unique_count == len(df) and len(df) > 1:
            insights.append({
                "type": "info",
                "title": "Posible columna ID",
                "detail": f'"{col.name}" tiene todos los valores únicos — puede ser un identificador.',
            })

    # Sin insights = buena noticia
    if not insights:
        insights.append({
            "type": "success",
            "title": "Datos en buen estado",
            "detail": "No se detectaron problemas críticos. El dataset está listo para análisis.",
        })

    return insights


# ── Función pública principal ─────────────────────────────────────────────────

def analyze(df: pd.DataFrame, file_name: str, file_size_bytes: int) -> DatasetSummary:
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "desconocido"
    col_infos = _analyze_columns(df)
    num_stats = _numeric_stats(df, col_infos)
    top_vals = _top_values(df, col_infos)
    insights = _generate_insights(df, col_infos, num_stats)

    total_cells = len(df) * len(df.columns)
    total_missing = sum(c.missing for c in col_infos)
    completeness = round((1 - total_missing / total_cells) * 100, 1) if total_cells > 0 else 100.0

    return DatasetSummary(
        rows=len(df),
        columns=len(df.columns),
        file_name=file_name,
        file_type=ext,
        size_kb=round(file_size_bytes / 1024, 2),
        completeness_pct=completeness,
        numeric_cols=sum(1 for c in col_infos if c.is_numeric),
        categorical_cols=sum(1 for c in col_infos if not c.is_numeric),
        column_info=col_infos,
        numeric_stats=num_stats,
        top_values=top_vals,
        insights=insights,
    )
