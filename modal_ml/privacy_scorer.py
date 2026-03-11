from __future__ import annotations

import itertools
import os
from datetime import datetime
from typing import Any

import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_categorical_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
    is_object_dtype,
)
from presidio_analyzer import AnalyzerEngine
from supabase import create_client

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
    "NRP",
]


def _sample_series(series: pd.Series, sample_size: int = 50) -> pd.Series:
    non_null = series.dropna()
    if non_null.empty:
        return non_null

    values = non_null.astype(str)
    n = min(sample_size, len(values))
    return values.sample(n=n, random_state=42) if len(values) > n else values


def _is_text_column(series: pd.Series) -> bool:
    return bool(is_object_dtype(series) or is_categorical_dtype(series))


def _quasi_identifier_columns(df: pd.DataFrame, max_columns: int = 8) -> list[str]:
    eligible: list[str] = []
    total_rows = max(len(df), 1)

    for col in df.columns:
        series = df[col]
        if series.isna().all():
            continue

        cardinality = int(series.nunique(dropna=True))
        if cardinality <= 1:
            continue

        if is_bool_dtype(series):
            eligible.append(col)
            continue

        if is_numeric_dtype(series) or is_datetime64_any_dtype(series) or _is_text_column(series):
            cardinality_ratio = cardinality / total_rows
            if cardinality_ratio < 0.98:
                eligible.append(col)

    return eligible[:max_columns]


def _uniqueness_ratio(df: pd.DataFrame, columns: tuple[str, ...]) -> float:
    subset = df[list(columns)].dropna()
    if subset.empty:
        return 0.0

    group_sizes = subset.groupby(list(columns), dropna=False).size()
    # Number of rows that appear in groups of size 1 divided by total rows.
    unique_row_count = int(group_sizes[group_sizes == 1].sum())
    return unique_row_count / len(subset)


def _row_overlap_ratio(original_df: pd.DataFrame, synthetic_df: pd.DataFrame, columns: tuple[str, ...]) -> float:
    syn_subset = synthetic_df[list(columns)].dropna()
    orig_subset = original_df[list(columns)].dropna()
    if syn_subset.empty or orig_subset.empty:
        return 0.0

    shared_rows = syn_subset.merge(orig_subset.drop_duplicates(), on=list(columns), how="inner")
    return len(shared_rows) / len(syn_subset)


def _risk_level(score: int) -> str:
    if score >= 80:
        return "low"
    if score >= 60:
        return "medium"
    if score >= 40:
        return "high"
    return "critical"


def score_privacy(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    synthetic_dataset_id: str,
) -> dict[str, Any]:
    analyzer = AnalyzerEngine()

    text_columns = [col for col in synthetic_df.columns if _is_text_column(synthetic_df[col])]
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
            for item in findings:
                entity_counts[item.entity_type] = entity_counts.get(item.entity_type, 0) + 1

        detection_ratio = flagged_rows / len(sample)
        if detection_ratio > 0.10:
            pii_detected[col] = {
                "detection_ratio": round(detection_ratio, 4),
                "entities": sorted(entity_counts.keys()),
                "entity_counts": entity_counts,
            }

    pii_column_count = len(pii_detected)

    shared_columns = [col for col in synthetic_df.columns if col in original_df.columns]
    quasi_identifiers = _quasi_identifier_columns(synthetic_df[shared_columns])

    singling_out_details: list[dict[str, Any]] = []
    linkability_details: list[dict[str, Any]] = []
    high_singling_out = False
    max_overlap = 0.0

    for size in (1, 2, 3):
        for combo in itertools.combinations(quasi_identifiers, size):
            syn_uniqueness = _uniqueness_ratio(synthetic_df, combo)
            orig_uniqueness = _uniqueness_ratio(original_df, combo)
            overlap = _row_overlap_ratio(original_df, synthetic_df, combo)

            singling_out_details.append(
                {
                    "columns": list(combo),
                    "synthetic_uniqueness_ratio": round(syn_uniqueness, 4),
                    "original_uniqueness_ratio": round(orig_uniqueness, 4),
                }
            )
            linkability_details.append(
                {
                    "columns": list(combo),
                    "overlap_ratio": round(overlap, 4),
                }
            )

            if size == 3 and syn_uniqueness > 0.15:
                high_singling_out = True
            max_overlap = max(max_overlap, overlap)

    pii_penalty = min(60, pii_column_count * 20)
    singling_out_penalty = 20 if high_singling_out else 0
    linkability_penalty = 20 if max_overlap > 0.05 else 0

    overall_score = max(0, 100 - pii_penalty - singling_out_penalty - linkability_penalty)
    risk_level = _risk_level(overall_score)

    details = {
        "pii_risk": {
            "flagged_columns": pii_column_count,
            "penalty": pii_penalty,
        },
        "singling_out_risk": {
            "high_risk": high_singling_out,
            "penalty": singling_out_penalty,
            "combinations": singling_out_details,
        },
        "linkability_risk": {
            "max_overlap_ratio": round(max_overlap, 4),
            "penalty": linkability_penalty,
            "combinations": linkability_details,
        },
        "quasi_identifiers": quasi_identifiers,
    }

    payload = {
        "synthetic_dataset_id": synthetic_dataset_id,
        "overall_score": overall_score,
        "pii_detected": pii_detected,
        "risk_level": risk_level,
        "singling_out_risk": round(
            max(
                (
                    item["synthetic_uniqueness_ratio"]
                    for item in singling_out_details
                    if len(item["columns"]) == 3
                ),
                default=0.0,
            ),
            4,
        ),
        "linkability_risk": round(max_overlap, 4),
        "details": details,
        "created_at": datetime.utcnow().isoformat(),
    }

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    supabase.table("privacy_scores").insert(payload).execute()

    return {
        "overall_score": overall_score,
        "risk_level": risk_level,
        "pii_detected": pii_detected,
        "details": details,
    }
