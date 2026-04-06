from __future__ import annotations

import itertools
from typing import Any

import pandas as pd
from pandas.api.types import is_categorical_dtype, is_object_dtype
from presidio_analyzer import AnalyzerEngine

from modal_ml.utils import supabase_client, update_job_progress

PII_ENTITIES = [
    "PERSON",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "CREDIT_CARD",
    "US_SSN",
    "LOCATION",
    "DATE_TIME",
    "IP_ADDRESS",
    "URL",
]


def _is_text_like(series: pd.Series) -> bool:
    return bool(is_object_dtype(series) or is_categorical_dtype(series))


def _sample_series(series: pd.Series, sample_size: int = 50) -> pd.Series:
    non_null = series.dropna().astype(str)
    if non_null.empty:
        return non_null
    n = min(sample_size, len(non_null))
    return non_null.sample(n=n, random_state=42) if len(non_null) > n else non_null


def _risk_level(score: int) -> str:
    if score >= 80:
        return "low"
    if score >= 60:
        return "medium"
    if score >= 40:
        return "high"
    return "critical"


def _row_overlap_exact_match(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    key_columns: list[str],
    sample_n: int = 200,
) -> float:
    if not key_columns:
        return 0.0

    syn_subset = synthetic_df[key_columns].dropna()
    orig_subset = original_df[key_columns].dropna()
    if syn_subset.empty or orig_subset.empty:
        return 0.0

    sampled = syn_subset.sample(n=min(sample_n, len(syn_subset)), random_state=42)
    original_keys = set(tuple(row) for row in orig_subset.itertuples(index=False, name=None))

    matched = 0
    for row in sampled.itertuples(index=False, name=None):
        if tuple(row) in original_keys:
            matched += 1

    denominator = min(sample_n, len(sampled))
    return matched / denominator if denominator else 0.0


def score_privacy(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    synthetic_dataset_id: str,
) -> dict[str, Any]:
    analyzer = AnalyzerEngine()

    # a) PII detection on text/categorical columns
    text_columns = [col for col in synthetic_df.columns if _is_text_like(synthetic_df[col])]
    pii_detected: dict[str, dict[str, Any]] = {}

    for col in text_columns:
        sample = _sample_series(synthetic_df[col], sample_size=50)
        if sample.empty:
            continue

        flagged_rows = 0
        entity_counts: dict[str, int] = {}

        for value in sample:
            findings = analyzer.analyze(text=value, entities=PII_ENTITIES, language="en")
            if not findings:
                continue

            flagged_rows += 1
            for finding in findings:
                entity_counts[finding.entity_type] = entity_counts.get(finding.entity_type, 0) + 1

        detection_ratio = flagged_rows / len(sample)
        if detection_ratio > 0.10:
            pii_detected[col] = {
                "detection_ratio": round(detection_ratio, 4),
                "entities": sorted(entity_counts.keys()),
                "entity_counts": entity_counts,
            }

    pii_penalty = -min(60, len(pii_detected) * 20)

    # b) Singling out risk: combinations up to 3 columns
    shared_columns = [c for c in synthetic_df.columns if c in original_df.columns]
    candidate_columns = [c for c in shared_columns if synthetic_df[c].dropna().nunique() > 1][:8]

    max_uniqueness = 0.0
    max_uniqueness_combo: list[str] = []

    for size in (1, 2, 3):
        for combo in itertools.combinations(candidate_columns, size):
            subset = synthetic_df[list(combo)].dropna()
            if subset.empty:
                continue
            uniqueness = subset.drop_duplicates().shape[0] / len(subset)
            if uniqueness > max_uniqueness:
                max_uniqueness = uniqueness
                max_uniqueness_combo = list(combo)

    singling_out_penalty = -20 if max_uniqueness > 0.15 else 0

    # c) Row overlap linkability
    key_columns = candidate_columns[:3]
    overlap_pct = _row_overlap_exact_match(original_df, synthetic_df, key_columns, sample_n=200)
    linkability_penalty = -20 if overlap_pct > 0.05 else 0

    # d) Final score
    overall_score = max(0, int(round(100 + pii_penalty + singling_out_penalty + linkability_penalty)))

    # e) Risk level
    risk_level = _risk_level(overall_score)

    details = {
        "pii_penalty": pii_penalty,
        "singling_out_penalty": singling_out_penalty,
        "linkability_penalty": linkability_penalty,
        "max_uniqueness": round(max_uniqueness, 4),
        "max_uniqueness_combo": max_uniqueness_combo,
        "overlap_pct": round(overlap_pct, 4),
        "overlap_key_columns": key_columns,
    }

    # f) Save to privacy_scores
    payload = {
        "synthetic_dataset_id": synthetic_dataset_id,
        "overall_score": overall_score,
        "pii_detected": pii_detected,
        "risk_level": risk_level,
        "details": details,
    }
    supabase_client().table("privacy_scores").insert(payload).execute()

    # g) Job progress update
    update_job_progress(synthetic_dataset_id, 85, "running", "Privacy scoring complete")

    # h) Return result
    return {
        "overall_score": overall_score,
        "risk_level": risk_level,
        "pii_detected": pii_detected,
        "details": details,
    }
