from __future__ import annotations

from io import BytesIO
from typing import Any

import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_datetime64_any_dtype,
    is_float_dtype,
    is_integer_dtype,
    is_numeric_dtype,
    is_object_dtype,
)


TRUE_VALUES = {"true", "t", "yes", "y", "1"}
FALSE_VALUES = {"false", "f", "no", "n", "0"}


class SchemaDetectionError(Exception):
    """Raised when automatic schema detection fails."""


def _serialize_value(value: Any) -> Any:
    if pd.isna(value):
        return None

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
    if len(normalized) != 2:
        return False

    return normalized.issubset(TRUE_VALUES.union(FALSE_VALUES))


def _is_datetime_column(series: pd.Series) -> bool:
    if is_datetime64_any_dtype(series):
        return True

    non_null = series.dropna()
    if non_null.empty:
        return False

    converted = pd.to_datetime(non_null, errors="coerce")
    success_ratio = converted.notna().mean()
    return success_ratio > 0.8


def _detect_column_type(series: pd.Series, unique_count: int, row_count: int) -> str:
    if _is_boolean_column(series):
        return "boolean"

    if _is_datetime_column(series):
        return "datetime"

    if is_numeric_dtype(series) or is_integer_dtype(series) or is_float_dtype(series):
        return "numeric"

    unique_ratio = (unique_count / row_count) if row_count else 0
    if is_object_dtype(series) and (unique_count < 50 or unique_ratio < 0.05):
        return "categorical"

    if is_object_dtype(series):
        return "text"

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
        value_counts = non_null.value_counts().head(5)
        top_values = [
            {"value": _serialize_value(index), "count": int(count)}
            for index, count in value_counts.items()
        ]
        stats: dict[str, Any] = {"top_values": top_values}
        if not value_counts.empty:
            stats["most_frequent"] = _serialize_value(value_counts.index[0])
        return stats

    return {}


def _load_dataframe(file_bytes: bytes, file_type: str) -> pd.DataFrame:
    normalized_type = (file_type or "").lower()
    buffer = BytesIO(file_bytes)

    if "csv" in normalized_type:
        return pd.read_csv(buffer)

    if "spreadsheet" in normalized_type or normalized_type.endswith("xlsx") or "excel" in normalized_type:
        return pd.read_excel(buffer)

    if "json" in normalized_type:
        parsed = pd.read_json(buffer)
        if isinstance(parsed, pd.DataFrame):
            normalized = pd.json_normalize(parsed.to_dict(orient="records"))
            return normalized
        return pd.json_normalize(parsed)

    if "parquet" in normalized_type:
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

    if df.empty and len(df.columns) == 0:
        raise SchemaDetectionError("File contains no rows or columns.")

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
        "columns": columns,
    }
