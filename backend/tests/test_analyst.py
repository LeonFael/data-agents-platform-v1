"""
Tests del agente analista y file router.
Ejecutar con: pytest tests/ -v
"""
import io
import os
import sys
import tempfile

import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.analyst import analyze
from app.services.file_router import route_file


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "nombre":   ["Ana", "Luis", "María", "Carlos", None],
        "edad":     [25, 32, 28, None, 45],
        "salario":  [3000, 5000, 4200, 3800, 6100],
        "ciudad":   ["Medellín", "Bogotá", "Medellín", "Cali", "Bogotá"],
    })


@pytest.fixture
def csv_file(sample_df, tmp_path):
    path = tmp_path / "test.csv"
    sample_df.to_csv(path, index=False)
    return str(path)


@pytest.fixture
def excel_file(sample_df, tmp_path):
    path = tmp_path / "test.xlsx"
    sample_df.to_excel(path, index=False)
    return str(path)


@pytest.fixture
def json_file(sample_df, tmp_path):
    path = tmp_path / "test.json"
    sample_df.to_json(path, orient="records", force_ascii=False)
    return str(path)


# ── Tests file router ─────────────────────────────────────────────────────────

class TestFileRouter:
    def test_csv_parses_correctly(self, csv_file):
        df = route_file(csv_file)
        assert len(df) == 5
        assert "nombre" in df.columns

    def test_excel_parses_correctly(self, excel_file):
        df = route_file(excel_file)
        assert len(df) == 5
        assert "salario" in df.columns

    def test_json_parses_correctly(self, json_file):
        df = route_file(json_file)
        assert len(df) == 5

    def test_unsupported_format_raises(self, tmp_path):
        path = tmp_path / "file.pdf"
        path.write_text("dummy")
        with pytest.raises(ValueError, match="no soportado"):
            route_file(str(path))

    def test_columns_are_stripped(self, tmp_path):
        path = tmp_path / "spaces.csv"
        path.write_text("  nombre  ,  edad  \nAna,25\nLuis,32\n")
        result = route_file(str(path))
        assert "nombre" in result.columns
        assert "edad" in result.columns


# ── Tests agente analista ─────────────────────────────────────────────────────

class TestAnalystAgent:
    def test_summary_row_count(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        assert summary.rows == 5

    def test_detects_numeric_columns(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        assert summary.numeric_cols >= 2  # edad, salario

    def test_detects_categorical_columns(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        assert summary.categorical_cols >= 2  # nombre, ciudad

    def test_completeness_below_100_with_nulls(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        assert summary.completeness_pct < 100.0

    def test_numeric_stats_computed(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        assert "salario" in summary.numeric_stats
        st = summary.numeric_stats["salario"]
        assert st.min == 3000.0
        assert st.max == 6100.0

    def test_top_values_for_categoricals(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        assert "ciudad" in summary.top_values
        cities = [item["value"] for item in summary.top_values["ciudad"]]
        assert "Medellín" in cities

    def test_insights_generated(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        assert len(summary.insights) > 0

    def test_null_insight_triggered(self, sample_df):
        summary = analyze(sample_df, "test.csv", 1024)
        titles = [i["title"] for i in summary.insights]
        assert any("nulos" in t.lower() or "faltantes" in t.lower() for t in titles)

    def test_empty_dataframe_handled(self):
        df = pd.DataFrame({"a": [], "b": []})
        summary = analyze(df, "empty.csv", 100)
        assert summary.rows == 0
        assert summary.completeness_pct == 100.0
