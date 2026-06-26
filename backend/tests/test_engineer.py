"""
Tests del Agente Ingeniero de Datos.
Ejecutar con: pytest tests/test_engineer.py -v
"""
import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.engineer import apply_action, find_suggestion, generate_suggestions
from app.services.engineer_session import create_session, get_session, undo_last_action, update_dataframe


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def messy_df():
    return pd.DataFrame({
        "edad": [25, 30, 35, np.nan, 40, 28, 33, np.nan, 29, 150, 31, 27],
        "salario": [3000, 4000, 3500, 4200, 3800, 3900, 150000, 4100, 3700, 3600, 3950, 3850],
        "ciudad": ["Bogota", "Medellin", "Bogota", "Cali", None, "Bogota",
                    "Medellin", "Cali", "Bogota", "Medellin", "Cali", "Bogota"],
    })


@pytest.fixture
def df_with_duplicates(messy_df):
    return pd.concat([messy_df, messy_df.iloc[[0, 1]]], ignore_index=True)


@pytest.fixture
def clean_df():
    return pd.DataFrame({
        "a": [1, 2, 3, 4, 5],
        "b": ["x", "y", "z", "w", "v"],
    })


# ── Tests de detección de sugerencias ─────────────────────────────────────────

class TestSuggestions:
    def test_detects_nulls(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        ids = [s.id for s in suggestions]
        assert "nulls_edad" in ids
        assert "nulls_ciudad" in ids

    def test_detects_duplicates(self, df_with_duplicates):
        suggestions = generate_suggestions(df_with_duplicates)
        dup = find_suggestion(suggestions, "duplicates_all")
        assert dup is not None
        assert dup.affected_rows == 2

    def test_detects_outliers(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        ids = [s.id for s in suggestions]
        assert "outliers_edad" in ids
        assert "outliers_salario" in ids

    def test_clean_dataset_has_no_suggestions(self, clean_df):
        suggestions = generate_suggestions(clean_df)
        assert len(suggestions) == 0

    def test_numeric_column_offers_imputation(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        edad = find_suggestion(suggestions, "nulls_edad")
        assert "impute_mean" in edad.available_actions
        assert "impute_median" in edad.available_actions

    def test_categorical_column_offers_mode_not_mean(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        ciudad = find_suggestion(suggestions, "nulls_ciudad")
        assert "impute_mode" in ciudad.available_actions
        assert "impute_mean" not in ciudad.available_actions

    def test_severity_scales_with_proportion(self):
        df = pd.DataFrame({"col": [1, 2, None, None]})
        suggestions = generate_suggestions(df)
        s = find_suggestion(suggestions, "nulls_col")
        assert s.severity == "high"


# ── Tests de aplicación de acciones ───────────────────────────────────────────

class TestApplyAction:
    def test_drop_duplicates_reduces_rows(self, df_with_duplicates):
        suggestions = generate_suggestions(df_with_duplicates)
        s = find_suggestion(suggestions, "duplicates_all")
        new_df, detail = apply_action(df_with_duplicates, s, "drop_duplicates")
        assert len(new_df) == len(df_with_duplicates) - 2
        assert detail["rows_affected"] == 2

    def test_impute_median_fills_nulls(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "nulls_edad")
        new_df, detail = apply_action(messy_df, s, "impute_median")
        assert new_df["edad"].isna().sum() == 0
        assert detail["rows_affected"] == 2

    def test_impute_mode_fills_categorical_nulls(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "nulls_ciudad")
        new_df, detail = apply_action(messy_df, s, "impute_mode")
        assert new_df["ciudad"].isna().sum() == 0

    def test_drop_column_removes_column(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "nulls_edad")
        new_df, detail = apply_action(messy_df, s, "drop_column")
        assert "edad" not in new_df.columns

    def test_drop_rows_removes_null_rows(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "nulls_edad")
        new_df, detail = apply_action(messy_df, s, "drop_rows")
        assert new_df["edad"].isna().sum() == 0
        assert len(new_df) == len(messy_df) - 2

    def test_cap_outliers_reduces_extreme_values(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "outliers_salario")
        new_df, detail = apply_action(messy_df, s, "cap_outliers")
        assert new_df["salario"].max() < 150000
        assert detail["rows_affected"] > 0

    def test_keep_action_does_nothing(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "outliers_salario")
        new_df, detail = apply_action(messy_df, s, "keep")
        pd.testing.assert_frame_equal(new_df, messy_df)
        assert detail["rows_affected"] == 0

    def test_invalid_action_raises(self, messy_df):
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "nulls_edad")
        with pytest.raises(ValueError):
            apply_action(messy_df, s, "accion_inexistente")


# ── Tests de sesión y undo ────────────────────────────────────────────────────

class TestEngineerSession:
    def test_create_and_get_session(self, messy_df):
        session_id = create_session(messy_df, "test.csv")
        session = get_session(session_id)
        assert session is not None
        assert session["file_name"] == "test.csv"
        assert len(session["df"]) == len(messy_df)

    def test_get_nonexistent_session_returns_none(self):
        assert get_session("no-existe-este-id") is None

    def test_update_dataframe_tracks_history(self, messy_df):
        session_id = create_session(messy_df, "test.csv")
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "nulls_edad")
        new_df, detail = apply_action(messy_df, s, "impute_median")

        update_dataframe(session_id, new_df, {
            "suggestion_id": "nulls_edad", "action": "impute_median", "detail": detail,
        })

        session = get_session(session_id)
        assert len(session["history"]) == 1
        assert session["df"]["edad"].isna().sum() == 0

    def test_undo_reverts_last_change(self, messy_df):
        session_id = create_session(messy_df, "test.csv")
        suggestions = generate_suggestions(messy_df)
        s = find_suggestion(suggestions, "nulls_edad")
        new_df, detail = apply_action(messy_df, s, "impute_median")
        update_dataframe(session_id, new_df, {
            "suggestion_id": "nulls_edad", "action": "impute_median", "detail": detail,
        })

        undo_last_action(session_id)
        session = get_session(session_id)
        assert session["df"]["edad"].isna().sum() == 2
        assert len(session["history"]) == 0

    def test_undo_without_history_raises(self, messy_df):
        session_id = create_session(messy_df, "test.csv")
        with pytest.raises(ValueError):
            undo_last_action(session_id)

    def test_multiple_actions_accumulate_in_history(self, df_with_duplicates):
        session_id = create_session(df_with_duplicates, "test.csv")

        suggestions = generate_suggestions(df_with_duplicates)
        dup = find_suggestion(suggestions, "duplicates_all")
        new_df, detail = apply_action(df_with_duplicates, dup, "drop_duplicates")
        update_dataframe(session_id, new_df, {"suggestion_id": "duplicates_all", "action": "drop_duplicates", "detail": detail})

        suggestions2 = generate_suggestions(new_df)
        nulls = find_suggestion(suggestions2, "nulls_edad")
        new_df2, detail2 = apply_action(new_df, nulls, "impute_median")
        update_dataframe(session_id, new_df2, {"suggestion_id": "nulls_edad", "action": "impute_median", "detail": detail2})

        session = get_session(session_id)
        assert len(session["history"]) == 2
        assert session["df"]["edad"].isna().sum() == 0
        assert len(session["df"]) == len(df_with_duplicates) - 2
