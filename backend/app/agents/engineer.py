"""
Agente Ingeniero de Datos v1.

Responsabilidad: detectar problemas de calidad (nulos, duplicados, outliers)
y proponer transformaciones — el usuario decide cuál aplicar.
Reutiliza el motor de análisis del Agente Analista para generar
el DatasetSummary antes/después de cada cambio.
"""
import pandas as pd

from app.agents.analyst import analyze
from app.models.schemas import CleaningSuggestion, DatasetSummary

# Umbrales para decidir severidad — ajustables sin tocar la lógica de detección
NULL_HIGH_THRESHOLD = 0.30     # 30%+ de nulos → severidad alta
NULL_MEDIUM_THRESHOLD = 0.05   # 5%+ → severidad media


# ── Detección de sugerencias ──────────────────────────────────────────────────

def generate_suggestions(df: pd.DataFrame) -> list[CleaningSuggestion]:
    suggestions: list[CleaningSuggestion] = []
    suggestions.extend(_suggest_for_nulls(df))
    suggestions.extend(_suggest_for_duplicates(df))
    suggestions.extend(_suggest_for_outliers(df))
    return suggestions


def _suggest_for_nulls(df: pd.DataFrame) -> list[CleaningSuggestion]:
    out = []
    for col in df.columns:
        missing = int(df[col].isna().sum())
        if missing == 0:
            continue
        pct = missing / len(df)
        is_numeric = pd.to_numeric(df[col], errors="coerce").notna().sum() > (len(df) - missing) * 0.7

        if pct >= NULL_HIGH_THRESHOLD:
            severity = "high"
        elif pct >= NULL_MEDIUM_THRESHOLD:
            severity = "medium"
        else:
            severity = "low"

        actions = ["drop_rows", "drop_column"]
        recommended = "drop_rows"
        if is_numeric:
            actions += ["impute_mean", "impute_median"]
            recommended = "impute_median" if pct < NULL_HIGH_THRESHOLD else "drop_column"
        else:
            actions += ["impute_mode"]
            recommended = "impute_mode" if pct < NULL_HIGH_THRESHOLD else "drop_column"

        out.append(CleaningSuggestion(
            id=f"nulls_{col}",
            category="nulls",
            column=col,
            title=f"{pct:.0%} de nulos en \"{col}\"",
            description=(
                f"La columna \"{col}\" tiene {missing} valores faltantes de {len(df)} filas "
                f"({pct:.0%}). " + (
                    "Es una proporción alta — considera si esta columna sigue siendo útil."
                    if severity == "high" else
                    "Imputar con la mediana/moda es razonable si el resto de la columna es confiable."
                    if severity == "medium" else
                    "Impacto bajo, pero conviene resolverlo antes de modelar."
                )
            ),
            recommended_action=recommended,
            available_actions=actions,
            severity=severity,
            affected_rows=missing,
        ))
    return out


def _suggest_for_duplicates(df: pd.DataFrame) -> list[CleaningSuggestion]:
    dup_count = int(df.duplicated().sum())
    if dup_count == 0:
        return []
    pct = dup_count / len(df)
    severity = "high" if pct >= 0.10 else "medium" if pct >= 0.02 else "low"

    return [CleaningSuggestion(
        id="duplicates_all",
        category="duplicates",
        column=None,
        title=f"{dup_count} filas duplicadas",
        description=(
            f"Se encontraron {dup_count} filas completamente idénticas ({pct:.1%} del dataset). "
            "Esto suele indicar errores de carga o registros repetidos por accidente."
        ),
        recommended_action="drop_duplicates",
        available_actions=["drop_duplicates", "keep"],
        severity=severity,
        affected_rows=dup_count,
    )]


def _suggest_for_outliers(df: pd.DataFrame) -> list[CleaningSuggestion]:
    out = []
    for col in df.columns:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 10:
            continue
        is_numeric = len(series) > df[col].notna().sum() * 0.7
        if not is_numeric:
            continue

        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outlier_mask = (series < lower) | (series > upper)
        n_outliers = int(outlier_mask.sum())
        if n_outliers == 0:
            continue

        pct = n_outliers / len(series)
        severity = "high" if pct >= 0.10 else "medium" if pct >= 0.03 else "low"

        out.append(CleaningSuggestion(
            id=f"outliers_{col}",
            category="outliers",
            column=col,
            title=f"{n_outliers} outliers en \"{col}\"",
            description=(
                f"Detectados por el método IQR: valores fuera de [{lower:.2f}, {upper:.2f}]. "
                f"Pueden ser errores de captura o casos reales extremos — revisa antes de eliminar."
            ),
            recommended_action="cap_outliers",
            available_actions=["cap_outliers", "drop_rows", "keep"],
            severity=severity,
            affected_rows=n_outliers,
        ))
    return out


# ── Aplicación de transformaciones ────────────────────────────────────────────

def apply_action(df: pd.DataFrame, suggestion: CleaningSuggestion, action: str) -> tuple[pd.DataFrame, dict]:
    """
    Aplica una transformación sobre el DataFrame.
    Devuelve (nuevo_df, detalle) — detalle describe qué se hizo para el log.
    """
    col = suggestion.column

    if action == "keep":
        return df, {"action": "keep", "column": col, "rows_affected": 0, "note": "Sin cambios."}

    if action == "drop_rows" and suggestion.category == "nulls":
        before = len(df)
        new_df = df.dropna(subset=[col])
        return new_df, {
            "action": "drop_rows", "column": col,
            "rows_affected": before - len(new_df),
            "note": f"Se eliminaron filas con nulos en '{col}'.",
        }

    if action == "drop_column":
        new_df = df.drop(columns=[col])
        return new_df, {
            "action": "drop_column", "column": col,
            "rows_affected": 0,
            "note": f"Se eliminó la columna '{col}' completa.",
        }

    if action == "impute_mean":
        numeric_col = pd.to_numeric(df[col], errors="coerce")
        mean_val = numeric_col.mean()
        n_filled = int(numeric_col.isna().sum())
        new_df = df.copy()
        new_df[col] = numeric_col.fillna(mean_val)
        return new_df, {
            "action": "impute_mean", "column": col,
            "rows_affected": n_filled,
            "note": f"Se imputaron {n_filled} valores con la media ({mean_val:.2f}).",
        }

    if action == "impute_median":
        numeric_col = pd.to_numeric(df[col], errors="coerce")
        median_val = numeric_col.median()
        n_filled = int(numeric_col.isna().sum())
        new_df = df.copy()
        new_df[col] = numeric_col.fillna(median_val)
        return new_df, {
            "action": "impute_median", "column": col,
            "rows_affected": n_filled,
            "note": f"Se imputaron {n_filled} valores con la mediana ({median_val:.2f}).",
        }

    if action == "impute_mode":
        mode_val = df[col].mode()
        mode_val = mode_val.iloc[0] if len(mode_val) else None
        n_filled = int(df[col].isna().sum())
        new_df = df.copy()
        new_df[col] = df[col].fillna(mode_val)
        return new_df, {
            "action": "impute_mode", "column": col,
            "rows_affected": n_filled,
            "note": f"Se imputaron {n_filled} valores con la moda ('{mode_val}').",
        }

    if action == "drop_duplicates":
        before = len(df)
        new_df = df.drop_duplicates()
        return new_df, {
            "action": "drop_duplicates", "column": None,
            "rows_affected": before - len(new_df),
            "note": f"Se eliminaron {before - len(new_df)} filas duplicadas.",
        }

    if action == "cap_outliers":
        numeric_col = pd.to_numeric(df[col], errors="coerce")
        q1, q3 = numeric_col.quantile(0.25), numeric_col.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        n_capped = int(((numeric_col < lower) | (numeric_col > upper)).sum())
        new_df = df.copy()
        new_df[col] = numeric_col.clip(lower=lower, upper=upper)
        return new_df, {
            "action": "cap_outliers", "column": col,
            "rows_affected": n_capped,
            "note": f"Se acotaron {n_capped} valores al rango [{lower:.2f}, {upper:.2f}] (winsorizing).",
        }

    if action == "drop_rows" and suggestion.category == "outliers":
        numeric_col = pd.to_numeric(df[col], errors="coerce")
        q1, q3 = numeric_col.quantile(0.25), numeric_col.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        mask = (numeric_col < lower) | (numeric_col > upper)
        before = len(df)
        new_df = df[~mask]
        return new_df, {
            "action": "drop_rows", "column": col,
            "rows_affected": before - len(new_df),
            "note": f"Se eliminaron {before - len(new_df)} filas con outliers en '{col}'.",
        }

    raise ValueError(f"Acción '{action}' no reconocida para la categoría '{suggestion.category}'.")


def find_suggestion(suggestions: list[CleaningSuggestion], suggestion_id: str) -> CleaningSuggestion | None:
    return next((s for s in suggestions if s.id == suggestion_id), None)


def summarize(df: pd.DataFrame, file_name: str) -> DatasetSummary:
    """Reutiliza el motor del Agente Analista — mismo formato de salida en ambos agentes."""
    size_estimate = df.memory_usage(deep=True).sum()
    return analyze(df, file_name, int(size_estimate))
