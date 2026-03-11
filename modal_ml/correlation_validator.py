from __future__ import annotations

from itertools import combinations
from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency, ks_2samp

from modal_ml.utils import supabase_client


DEGRADED_THRESHOLD = 0.15
KS_DRIFT_THRESHOLD = 0.1
CORRELATION_PASS_THRESHOLD = 75.0
DISTRIBUTION_PASS_THRESHOLD = 80.0


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _cramers_v(frame: pd.DataFrame, left: str, right: str) -> float:
    contingency = pd.crosstab(frame[left], frame[right])
    if contingency.empty:
        return 0.0

    chi2, _, _, _ = chi2_contingency(contingency)
    n = contingency.to_numpy().sum()
    if n == 0:
        return 0.0

    r, k = contingency.shape
    if r <= 1 or k <= 1:
        return 0.0

    return float(np.sqrt((chi2 / n) / min(k - 1, r - 1)))


def validate_correlations(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    synthetic_dataset_id: str,
) -> dict[str, Any]:
    """Validate pairwise structure and column distributions between original and synthetic data."""

    numeric_columns = [
        column
        for column in original_df.select_dtypes(include=[np.number]).columns
        if column in synthetic_df.columns
    ]
    categorical_columns = [
        column
        for column in original_df.select_dtypes(exclude=[np.number]).columns
        if column in synthetic_df.columns
    ]

    corr_original = original_df[numeric_columns].corr(method="pearson") if numeric_columns else pd.DataFrame()
    corr_synthetic = synthetic_df[numeric_columns].corr(method="pearson") if numeric_columns else pd.DataFrame()

    diff_matrix = (corr_original - corr_synthetic).abs() if numeric_columns else pd.DataFrame()

    pair_scores: list[float] = []
    numeric_pair_stats: list[dict[str, Any]] = []
    for left, right in combinations(numeric_columns, 2):
        original_corr = _safe_float(corr_original.loc[left, right])
        synthetic_corr = _safe_float(corr_synthetic.loc[left, right])
        difference = _safe_float(diff_matrix.loc[left, right])
        score = max(0.0, 1.0 - difference)
        pair_scores.append(score)
        numeric_pair_stats.append(
            {
                "pair": f"{left}:{right}",
                "original": original_corr,
                "synthetic": synthetic_corr,
                "difference": difference,
                "score": score,
                "degraded": difference > DEGRADED_THRESHOLD,
            }
        )

    categorical_pair_stats: list[dict[str, Any]] = []
    for left, right in combinations(categorical_columns, 2):
        original_assoc = _cramers_v(original_df, left, right)
        synthetic_assoc = _cramers_v(synthetic_df, left, right)
        difference = abs(original_assoc - synthetic_assoc)
        score = max(0.0, 1.0 - difference)
        pair_scores.append(score)
        categorical_pair_stats.append(
            {
                "pair": f"{left}:{right}",
                "original": original_assoc,
                "synthetic": synthetic_assoc,
                "difference": difference,
                "score": score,
                "degraded": difference > DEGRADED_THRESHOLD,
            }
        )

    distribution_checks: list[dict[str, Any]] = []
    passing_distribution_columns = 0

    for column in numeric_columns:
        original = original_df[column].dropna()
        synthetic = synthetic_df[column].dropna()
        if original.empty or synthetic.empty:
            statistic = 1.0
            p_value = 0.0
        else:
            statistic, p_value = ks_2samp(original, synthetic)

        passed = statistic <= KS_DRIFT_THRESHOLD
        passing_distribution_columns += int(passed)
        distribution_checks.append(
            {
                "column": column,
                "type": "numeric",
                "method": "ks_2samp",
                "statistic": float(statistic),
                "p_value": float(p_value),
                "drift": float(statistic) > KS_DRIFT_THRESHOLD,
                "passed": passed,
            }
        )

    for column in categorical_columns:
        original_freq = original_df[column].fillna("__MISSING__").value_counts()
        synthetic_freq = synthetic_df[column].fillna("__MISSING__").value_counts()
        categories = sorted(set(original_freq.index).union(set(synthetic_freq.index)))
        contingency = np.array(
            [
                [int(original_freq.get(category, 0)), int(synthetic_freq.get(category, 0))]
                for category in categories
            ]
        )

        if contingency.sum() == 0 or len(categories) <= 1:
            statistic = 0.0
            p_value = 1.0
        else:
            statistic, p_value, _, _ = chi2_contingency(contingency)

        passed = p_value >= 0.05
        passing_distribution_columns += int(passed)
        distribution_checks.append(
            {
                "column": column,
                "type": "categorical",
                "method": "chi2_contingency",
                "statistic": float(statistic),
                "p_value": float(p_value),
                "drift": not passed,
                "passed": passed,
            }
        )

    total_columns = len(numeric_columns) + len(categorical_columns)
    correlation_score = float(np.mean(pair_scores) * 100) if pair_scores else 100.0
    distribution_score = float((passing_distribution_columns / total_columns) * 100) if total_columns else 100.0
    overall_score = round((correlation_score + distribution_score) / 2, 2)
    passed = correlation_score > CORRELATION_PASS_THRESHOLD and distribution_score > DISTRIBUTION_PASS_THRESHOLD

    result = {
        "synthetic_dataset_id": synthetic_dataset_id,
        "correlation_score": round(correlation_score, 2),
        "distribution_score": round(distribution_score, 2),
        "overall_score": overall_score,
        "column_stats": {
            "numeric_pairs": numeric_pair_stats,
            "categorical_pairs": categorical_pair_stats,
            "distribution": distribution_checks,
            "correlation_matrices": {
                "original": corr_original.fillna(0).to_dict() if not corr_original.empty else {},
                "synthetic": corr_synthetic.fillna(0).to_dict() if not corr_synthetic.empty else {},
                "difference": diff_matrix.fillna(0).to_dict() if not diff_matrix.empty else {},
            },
        },
        "passed": passed,
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

    return result


def correlation_validator(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Backward-compatible entrypoint used by the Modal job flow."""
    synthetic_dataset_id = str((context or {}).get("synthetic_dataset_id") or "")
    return validate_correlations(original_df, synthetic_df, synthetic_dataset_id)
