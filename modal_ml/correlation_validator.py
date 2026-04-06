from __future__ import annotations

from itertools import combinations
from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency, ks_2samp


def validate_correlations(original_df: pd.DataFrame, synthetic_df: pd.DataFrame) -> dict[str, Any]:
    """Validate correlation preservation and distribution similarity."""
    numeric_columns = [
        column
        for column in original_df.select_dtypes(include=[np.number]).columns
        if column in synthetic_df.columns
    ]
    shared_columns = [column for column in original_df.columns if column in synthetic_df.columns]

    corr_original = original_df[numeric_columns].corr(method="pearson") if numeric_columns else pd.DataFrame()
    corr_synthetic = synthetic_df[numeric_columns].corr(method="pearson") if numeric_columns else pd.DataFrame()

    abs_diffs: list[float] = []
    pair_details: list[dict[str, Any]] = []

    for left, right in combinations(numeric_columns, 2):
        orig_corr = float(corr_original.loc[left, right]) if not pd.isna(corr_original.loc[left, right]) else 0.0
        synth_corr = float(corr_synthetic.loc[left, right]) if not pd.isna(corr_synthetic.loc[left, right]) else 0.0
        diff = abs(orig_corr - synth_corr)
        abs_diffs.append(diff)
        pair_details.append(
            {
                "pair": [left, right],
                "original": round(orig_corr, 4),
                "synthetic": round(synth_corr, 4),
                "abs_diff": round(diff, 4),
            }
        )

    mean_abs_diff = float(np.mean(abs_diffs)) if abs_diffs else 0.0
    correlation_score = max(0.0, (1 - mean_abs_diff) * 100)

    passing_columns = 0
    distribution_details: list[dict[str, Any]] = []

    for column in shared_columns:
        orig = original_df[column].dropna()
        synth = synthetic_df[column].dropna()

        if pd.api.types.is_numeric_dtype(original_df[column]) and pd.api.types.is_numeric_dtype(synthetic_df[column]):
            if orig.empty or synth.empty:
                ks_stat = 1.0
            else:
                ks_stat, _ = ks_2samp(orig, synth)
            passed = ks_stat <= 0.10
            distribution_details.append(
                {
                    "column": column,
                    "type": "numeric",
                    "method": "ks_2samp",
                    "statistic": round(float(ks_stat), 4),
                    "passed": passed,
                }
            )
        else:
            orig_freq = orig.astype(str).value_counts()
            synth_freq = synth.astype(str).value_counts()
            categories = sorted(set(orig_freq.index).union(set(synth_freq.index)))
            contingency = np.array(
                [[int(orig_freq.get(c, 0)), int(synth_freq.get(c, 0))] for c in categories]
            )
            if contingency.sum() == 0 or len(categories) <= 1:
                p_value = 1.0
                chi2 = 0.0
            else:
                chi2, p_value, _, _ = chi2_contingency(contingency)
            passed = p_value >= 0.05
            distribution_details.append(
                {
                    "column": column,
                    "type": "categorical",
                    "method": "chi2_contingency",
                    "statistic": round(float(chi2), 4),
                    "p_value": round(float(p_value), 4),
                    "passed": passed,
                }
            )

        passing_columns += int(passed)

    distribution_score = (passing_columns / len(shared_columns) * 100) if shared_columns else 100.0
    overall_score = (correlation_score + distribution_score) / 2
    passed = correlation_score > 75 and distribution_score > 80

    return {
        "correlation_score": round(correlation_score, 2),
        "distribution_score": round(distribution_score, 2),
        "overall_score": round(overall_score, 2),
        "passed": passed,
        "details": {
            "pairs": pair_details,
            "distribution": distribution_details,
            "correlation_matrices": {
                "original": corr_original.fillna(0).to_dict() if not corr_original.empty else {},
                "synthetic": corr_synthetic.fillna(0).to_dict() if not corr_synthetic.empty else {},
            },
        },
    }


def correlation_validator(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return validate_correlations(original_df, synthetic_df)
