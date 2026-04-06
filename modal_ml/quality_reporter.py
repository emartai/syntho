from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency, ks_2samp

from modal_ml.correlation_validator import validate_correlations
from modal_ml.utils import supabase_client, update_job_progress


def _series_stats(series: pd.Series) -> dict[str, Any]:
    clean = series.dropna()
    stats: dict[str, Any] = {
        "mean": None,
        "median": None,
        "std": None,
        "min": None,
        "max": None,
        "null_pct": round(float(series.isna().mean() * 100), 2),
        "top_values": [
            {"value": str(v), "count": int(c)}
            for v, c in series.fillna("__MISSING__").value_counts().head(10).items()
        ],
    }

    if pd.api.types.is_numeric_dtype(series) and not clean.empty:
        stats.update(
            {
                "mean": round(float(clean.mean()), 6),
                "median": round(float(clean.median()), 6),
                "std": round(float(clean.std(ddof=0)), 6),
                "min": round(float(clean.min()), 6),
                "max": round(float(clean.max()), 6),
            }
        )

    return stats


def _numeric_distribution(original: pd.Series, synthetic: pd.Series) -> list[dict[str, Any]]:
    orig = original.dropna()
    synth = synthetic.dropna()
    if orig.empty and synth.empty:
        return []

    combined = pd.concat([orig, synth], ignore_index=True)
    min_v = float(combined.min())
    max_v = float(combined.max())

    bins = np.linspace(min_v, max_v if max_v > min_v else min_v + 1, num=21)
    o_hist, _ = np.histogram(orig, bins=bins)
    s_hist, _ = np.histogram(synth, bins=bins)

    return [
        {
            "bin_start": float(bins[i]),
            "bin_end": float(bins[i + 1]),
            "original": int(o_hist[i]),
            "synthetic": int(s_hist[i]),
        }
        for i in range(len(bins) - 1)
    ]


def _categorical_distribution(original: pd.Series, synthetic: pd.Series) -> list[dict[str, Any]]:
    o = original.fillna("__MISSING__").astype(str).value_counts()
    s = synthetic.fillna("__MISSING__").astype(str).value_counts()
    categories = list(o.head(10).index)
    for c in s.index:
        if c not in categories:
            categories.append(c)
        if len(categories) >= 10:
            break

    return [{"label": c, "original": int(o.get(c, 0)), "synthetic": int(s.get(c, 0))} for c in categories]


def _drift_score(original: pd.Series, synthetic: pd.Series) -> float:
    if pd.api.types.is_numeric_dtype(original) and pd.api.types.is_numeric_dtype(synthetic):
        o = original.dropna()
        s = synthetic.dropna()
        if o.empty or s.empty:
            return 0.0
        ks_stat, _ = ks_2samp(o, s)
        return round(max(0.0, 1.0 - float(ks_stat)), 4)

    o = original.fillna("__MISSING__").astype(str).value_counts()
    s = synthetic.fillna("__MISSING__").astype(str).value_counts()
    categories = sorted(set(o.index).union(set(s.index)))
    contingency = np.array([[int(o.get(c, 0)), int(s.get(c, 0))] for c in categories])
    if contingency.sum() == 0 or len(categories) <= 1:
        return 1.0
    _, p_value, _, _ = chi2_contingency(contingency)
    return round(float(p_value), 4)


def generate_quality_stats(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    synthetic_dataset_id: str,
) -> dict[str, Any]:
    shared_columns = [c for c in original_df.columns if c in synthetic_df.columns]
    correlations = validate_correlations(original_df, synthetic_df)

    column_stats: list[dict[str, Any]] = []
    for column in shared_columns:
        o = original_df[column]
        s = synthetic_df[column]
        numeric = pd.api.types.is_numeric_dtype(o) and pd.api.types.is_numeric_dtype(s)

        column_stats.append(
            {
                "column": column,
                "type": "numeric" if numeric else "categorical",
                "original_stats": _series_stats(o),
                "synthetic_stats": _series_stats(s),
                "distribution_data": _numeric_distribution(o, s) if numeric else _categorical_distribution(o, s),
                "drift_score": _drift_score(o, s),
            }
        )

    result = {
        "correlation_score": correlations["correlation_score"],
        "distribution_score": correlations["distribution_score"],
        "overall_score": correlations["overall_score"],
        "column_stats": {
            "columns": column_stats,
            "validator": correlations["details"],
        },
        "passed": correlations["passed"],
    }

    supabase_client().table("quality_reports").upsert(
        {
            "synthetic_dataset_id": synthetic_dataset_id,
            "correlation_score": result["correlation_score"],
            "distribution_score": result["distribution_score"],
            "overall_score": result["overall_score"],
            "column_stats": result["column_stats"],
            "passed": result["passed"],
        },
        on_conflict="synthetic_dataset_id",
    ).execute()

    update_job_progress(synthetic_dataset_id, 92, "running", "Quality analysis complete")

    return result


def quality_reporter(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    context = context or {}
    synthetic_dataset_id = str(context.get("synthetic_dataset_id") or context.get("payload", {}).get("synthetic_dataset_id") or "")
    if not synthetic_dataset_id:
        raise ValueError("synthetic_dataset_id is required")
    return generate_quality_stats(original_df, synthetic_df, synthetic_dataset_id)
