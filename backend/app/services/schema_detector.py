from __future__ import annotations

import json
import warnings
from io import BytesIO
from typing import Any

import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_float_dtype,
    is_integer_dtype,
    is_object_dtype,
)


TRUE_VALUES = {"true", "t", "yes", "y", "1"}
FALSE_VALUES = {"false", "f", "no", "n", "0"}
MAX_COLUMNS = 1000


class SchemaDetectionError(Exception):
    """Raised when automatic schema detection fails."""


def _serialize_value(value: Any) -> Any:
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    return value


def _is_boolean_column(series: pd.Series) -> bool:
    if is_bool_dtype(series):
        return True

    non_null = series.dropna()
    if non_null.empty:
        return False

    normalized = {str(v).strip().lower() for v in non_null.unique()}
    if len(normalized) > 2:
        return False

    return normalized.issubset(TRUE_VALUES.union(FALSE_VALUES))


def _is_datetime_column(series: pd.Series) -> bool:
    non_null = series.dropna()
    if non_null.empty:
        return False

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        converted = pd.to_datetime(non_null, errors="coerce")
    success_ratio = converted.notna().mean()
    return success_ratio > 0.8


def _detect_column_type(series: pd.Series, unique_count: int, row_count: int) -> str:
    if _is_boolean_column(series):
        return "boolean"

    if is_integer_dtype(series) or is_float_dtype(series):
        return "numeric"

    if _is_datetime_column(series):
        return "datetime"

    unique_ratio = (unique_count / row_count) if row_count else 0
    if is_object_dtype(series) and (unique_count < 50 or unique_ratio < 0.05):
        return "categorical"

    return "text"


def _column_stats(series: pd.Series, detected_type: str) -> dict[str, Any]:
    non_null = series.dropna()

    if detected_type == "numeric":
        numeric_series = pd.to_numeric(non_null, errors="coerce").dropna()
        if numeric_series.empty:
            return {}
        return {
            "min": _serialize_value(numeric_series.min()),
            "max": _serialize_value(numeric_series.max()),
            "mean": _serialize_value(numeric_series.mean()),
        }

    if detected_type == "categorical":
        value_counts = non_null.astype(str).value_counts().head(3)
        return {
            "top_3_values": [
                {"value": value, "count": int(count)} for value, count in value_counts.items()
            ]
        }

    return {}


def _load_json_dataframe(file_bytes: bytes) -> pd.DataFrame:
    try:
        payload = json.loads(file_bytes.decode("utf-8"))
    except Exception as exc:
        raise SchemaDetectionError(f"Invalid JSON file: {exc}") from exc

    if isinstance(payload, list):
        return pd.json_normalize(payload)

    if isinstance(payload, dict):
        # Common patterns: {"data": [...]}, {"rows": [...]}, nested object
        for key in ("data", "rows", "items", "results"):
            if isinstance(payload.get(key), list):
                return pd.json_normalize(payload[key])
        return pd.json_normalize(payload)

    raise SchemaDetectionError("JSON payload must be an object or an array")


def _load_dataframe(file_bytes: bytes, file_type: str) -> pd.DataFrame:
    normalized_type = (file_type or "").lower()
    buffer = BytesIO(file_bytes)

    if "csv" in normalized_type:
        return pd.read_csv(buffer)

    if (
        "spreadsheet" in normalized_type
        or "excel" in normalized_type
        or normalized_type.endswith("xlsx")
        or normalized_type == "application/zip"
    ):
        return pd.read_excel(buffer)

    if "json" in normalized_type:
        return _load_json_dataframe(file_bytes)

    if "parquet" in normalized_type or normalized_type == "application/octet-stream":
        return pd.read_parquet(buffer)

    raise SchemaDetectionError(f"Unsupported file format: {file_type}")


def detect_schema(file_bytes: bytes, file_type: str) -> dict[str, Any]:
    """Detect schema metadata from CSV, Excel, JSON, and Parquet files."""
    if not file_bytes:
        raise SchemaDetectionError("File is empty.")

    try:
        df = _load_dataframe(file_bytes=file_bytes, file_type=file_type)
    except SchemaDetectionError:
        raise
    except Exception as exc:
        raise SchemaDetectionError(f"Failed to parse file content: {exc}") from exc

    if df.shape[1] > MAX_COLUMNS:
        raise SchemaDetectionError(f"File has too many columns ({df.shape[1]}). Maximum is {MAX_COLUMNS}.")

    if len(df) == 0:
        raise SchemaDetectionError("File contains 0 rows.")

    row_count = len(df)
    columns: list[dict[str, Any]] = []

    for column_name in df.columns:
        series = df[column_name]
        non_null = series.dropna()
        unique_count = int(non_null.nunique())
        null_percentage = float((series.isna().sum() / row_count) * 100) if row_count else 0.0

        detected_type = _detect_column_type(series=series, unique_count=unique_count, row_count=row_count)
        sample_values = [_serialize_value(v) for v in non_null.head(3).tolist()]

        columns.append(
            {
                "name": str(column_name),
                "data_type": detected_type,
                "null_percentage": round(null_percentage, 2),
                "unique_count": unique_count,
                "sample_values": sample_values,
                "stats": _column_stats(series, detected_type),
            }
        )

    return {
        "row_count": row_count,
        "column_count": len(df.columns),
        "file_size_bytes": len(file_bytes),
        "columns": columns,
    }
