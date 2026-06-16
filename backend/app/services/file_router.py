import json
import os
from abc import ABC, abstractmethod

import pandas as pd

from app.core.config import get_settings

settings = get_settings()


# ── Clases base ──────────────────────────────────────────────────────────────

class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: str) -> pd.DataFrame:
        pass


# ── Parsers concretos ─────────────────────────────────────────────────────────

class CsvParser(BaseParser):
    def parse(self, file_path: str) -> pd.DataFrame:
        # Intentar detectar encoding y separador automáticamente
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                df = pd.read_csv(file_path, encoding=enc)
                if len(df.columns) == 1:
                    # Puede ser separador diferente
                    df = pd.read_csv(file_path, encoding=enc, sep=None, engine="python")
                return df
            except UnicodeDecodeError:
                continue
        raise ValueError("No se pudo leer el CSV: encoding no soportado")


class ExcelParser(BaseParser):
    def parse(self, file_path: str) -> pd.DataFrame:
        xl = pd.ExcelFile(file_path)
        # Siempre lee la primera hoja; en v2 permitiremos elegir
        df = pd.read_excel(xl, sheet_name=0)
        return df


class JsonParser(BaseParser):
    def parse(self, file_path: str) -> pd.DataFrame:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return pd.DataFrame(data)
        if isinstance(data, dict):
            # Intentar normalizar JSON anidado
            return pd.json_normalize(data)
        raise ValueError("Estructura JSON no soportada para análisis tabular")


# ── Registro central ──────────────────────────────────────────────────────────
# Añadir soporte para un nuevo formato = una clase + una línea aquí

PARSERS: dict[str, BaseParser] = {
    ".csv":     CsvParser(),
    ".xlsx":    ExcelParser(),
    ".xls":     ExcelParser(),
    ".json":    JsonParser(),
    # ".parquet": ParquetParser(),   # v2
    # ".pdf":     PdfParser(),       # v3
}


# ── Router público ────────────────────────────────────────────────────────────

def get_supported_extensions() -> list[str]:
    return list(PARSERS.keys())


def route_file(file_path: str) -> pd.DataFrame:
    ext = os.path.splitext(file_path)[-1].lower()

    if ext not in PARSERS:
        supported = ", ".join(PARSERS.keys())
        raise ValueError(
            f"Formato '{ext}' no soportado. "
            f"Formatos disponibles: {supported}"
        )

    parser = PARSERS[ext]
    df = parser.parse(file_path)

    if df.empty:
        raise ValueError("El archivo está vacío o no contiene datos legibles")

    # Limpiar nombres de columnas (espacios, caracteres raros)
    df.columns = [str(c).strip() for c in df.columns]

    return df
