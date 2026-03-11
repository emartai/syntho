from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _series_stats(series: pd.Series) -> dict[str, Any]:
    clean = series.dropna()
    stats: dict[str, Any] = {
        "mean": None,
        "median": None,
        "std": None,
        "min": None,
        "max": None,
        "null_pct": round(_safe_float(series.isna().mean()) * 100, 2),
        "top_values": [
            {"value": str(value), "count": int(count)}
            for value, count in series.fillna("__MISSING__").value_counts().head(5).items()
        ],
    }

    if pd.api.types.is_numeric_dtype(series):
        if clean.empty:
            return stats

        stats.update(
            {
                "mean": round(_safe_float(clean.mean()), 6),
                "median": round(_safe_float(clean.median()), 6),
                "std": round(_safe_float(clean.std(ddof=0)), 6),
                "min": round(_safe_float(clean.min()), 6),
                "max": round(_safe_float(clean.max()), 6),
            }
        )

    return stats


def _numeric_distribution(original: pd.Series, synthetic: pd.Series) -> list[dict[str, Any]]:
    original_clean = original.dropna()
    synthetic_clean = synthetic.dropna()
    if original_clean.empty and synthetic_clean.empty:
        return []

    combined = pd.concat([original_clean, synthetic_clean], ignore_index=True)
    min_value = _safe_float(combined.min())
    max_value = _safe_float(combined.max())

    if np.isclose(min_value, max_value):
        bin_edges = np.array([min_value, min_value + 1.0])
    else:
        bin_edges = np.linspace(min_value, max_value, num=21)

    original_hist, _ = np.histogram(original_clean, bins=bin_edges)
    synthetic_hist, _ = np.histogram(synthetic_clean, bins=bin_edges)

    chart_data: list[dict[str, Any]] = []
    for index in range(len(bin_edges) - 1):
        left = float(bin_edges[index])
        right = float(bin_edges[index + 1])
        chart_data.append(
            {
                "label": f"{left:.2f} - {right:.2f}",
                "bin_start": left,
                "bin_end": right,
                "original": int(original_hist[index]),
                "synthetic": int(synthetic_hist[index]),
            }
        )

    return chart_data


def _categorical_distribution(original: pd.Series, synthetic: pd.Series) -> list[dict[str, Any]]:
    original_freq = original.fillna("__MISSING__").astype(str).value_counts()
    synthetic_freq = synthetic.fillna("__MISSING__").astype(str).value_counts()

    categories = list(original_freq.head(10).index)
    for category in synthetic_freq.index:
        if category not in categories:
            categories.append(category)
        if len(categories) == 10:
            break

    return [
        {
            "label": str(category),
            "original": int(original_freq.get(category, 0)),
            "synthetic": int(synthetic_freq.get(category, 0)),
        }
        for category in categories
    ]


def _numeric_drift(original: pd.Series, synthetic: pd.Series) -> float:
    original_clean = original.dropna()
    synthetic_clean = synthetic.dropna()
    if original_clean.empty or synthetic_clean.empty:
        return 1.0

    original_mean = _safe_float(original_clean.mean())
    synthetic_mean = _safe_float(synthetic_clean.mean())

    pooled_std = np.std(pd.concat([original_clean, synthetic_clean], ignore_index=True), ddof=0)
    if pooled_std == 0:
        return 0.0 if np.isclose(original_mean, synthetic_mean) else 1.0

    score = abs(original_mean - synthetic_mean) / pooled_std
    return float(max(0.0, min(1.0, score)))


def _categorical_drift(original: pd.Series, synthetic: pd.Series) -> float:
    original_freq = original.fillna("__MISSING__").astype(str).value_counts(normalize=True)
    synthetic_freq = synthetic.fillna("__MISSING__").astype(str).value_counts(normalize=True)

    categories = sorted(set(original_freq.index).union(set(synthetic_freq.index)))
    if not categories:
        return 0.0

    tvd = 0.5 * sum(abs(float(original_freq.get(category, 0.0)) - float(synthetic_freq.get(category, 0.0))) for category in categories)
    return float(max(0.0, min(1.0, tvd)))


def generate_quality_stats(original_df: pd.DataFrame, synthetic_df: pd.DataFrame) -> dict[str, Any]:
    """Generate side-by-side data quality statistics for original and synthetic datasets."""

    shared_columns = [column for column in original_df.columns if column in synthetic_df.columns]
    columns_output: list[dict[str, Any]] = []
    drift_scores: list[float] = []

    for column in shared_columns:
        original_series = original_df[column]
        synthetic_series = synthetic_df[column]
        is_numeric = pd.api.types.is_numeric_dtype(original_series) and pd.api.types.is_numeric_dtype(synthetic_series)

        distribution_data = (
            _numeric_distribution(original_series, synthetic_series)
            if is_numeric
            else _categorical_distribution(original_series, synthetic_series)
        )
        drift_score = _numeric_drift(original_series, synthetic_series) if is_numeric else _categorical_drift(original_series, synthetic_series)
        drift_scores.append(drift_score)

        columns_output.append(
            {
                "column": column,
                "type": "numeric" if is_numeric else "categorical",
                "original_stats": _series_stats(original_series),
                "synthetic_stats": _series_stats(synthetic_series),
                "distribution_data": distribution_data,
                "drift_score": round(float(drift_score), 4),
            }
        )

    overall_fidelity_score = 1.0 - (float(np.mean(drift_scores)) if drift_scores else 0.0)

    return {
        "columns": columns_output,
        "overall_fidelity_score": round(max(0.0, min(1.0, overall_fidelity_score)), 4),
    }


def quality_reporter(dataframe: pd.DataFrame, context: dict[str, Any] | None = None) -> dict[str, Any] | None:
    """Backward-compatible entrypoint for the Modal workflow."""

    original_df = (context or {}).get("original_df")
    if isinstance(original_df, pd.DataFrame):
        return generate_quality_stats(original_df, dataframe)

    return None
