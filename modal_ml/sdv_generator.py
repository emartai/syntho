from __future__ import annotations

from typing import Any, Callable

import pandas as pd
from sdv.metadata import SingleTableMetadata
from sdv.single_table import GaussianCopulaSynthesizer

from modal_ml.ctgan_generator import CancelledError
from modal_ml.utils import update_job_progress


def _build_metadata(df: pd.DataFrame) -> SingleTableMetadata:
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(data=df)

    for column in df.columns:
        series = df[column]
        lower_name = column.lower()
        is_identifier = series.is_unique and series.notna().all() and (
            lower_name == "id" or lower_name.endswith("_id") or lower_name.endswith("id")
        )

        if is_identifier:
            metadata.update_column(column_name=column, sdtype="id")
        elif pd.api.types.is_bool_dtype(series):
            metadata.update_column(column_name=column, sdtype="boolean")
        elif pd.api.types.is_datetime64_any_dtype(series):
            metadata.update_column(column_name=column, sdtype="datetime")
        elif pd.api.types.is_numeric_dtype(series):
            metadata.update_column(column_name=column, sdtype="numerical")
        else:
            metadata.update_column(column_name=column, sdtype="categorical")

    primary_key = next(
        (
            column
            for column in df.columns
            if df[column].is_unique
            and df[column].notna().all()
            and (column.lower() == "id" or column.lower().endswith("_id") or column.lower().endswith("id"))
        ),
        None,
    )
    if primary_key:
        metadata.set_primary_key(primary_key)

    return metadata


def _preserve_dataframe_dtypes(synthetic_df: pd.DataFrame, source_df: pd.DataFrame) -> pd.DataFrame:
    casted_df = synthetic_df.copy()
    for column in casted_df.columns:
        if column not in source_df.columns:
            continue

        source_dtype = source_df[column].dtype

        try:
            if pd.api.types.is_integer_dtype(source_dtype):
                casted_df[column] = pd.to_numeric(casted_df[column], errors="coerce").round().astype(source_dtype)
            elif pd.api.types.is_float_dtype(source_dtype):
                casted_df[column] = pd.to_numeric(casted_df[column], errors="coerce").astype(source_dtype)
            elif pd.api.types.is_datetime64_any_dtype(source_dtype):
                casted_df[column] = pd.to_datetime(casted_df[column], errors="coerce")
            elif pd.api.types.is_bool_dtype(source_dtype):
                casted_df[column] = casted_df[column].astype(bool)
            else:
                casted_df[column] = casted_df[column].astype(source_dtype)
        except Exception:
            continue

    return casted_df


def generate_gaussian_copula(
    df: pd.DataFrame,
    config: dict[str, Any],
    synthetic_dataset_id: str,
) -> pd.DataFrame:
    if df.empty:
        raise ValueError("Source dataframe is empty")

    cancel_check = config.get("_cancel_check")

    def raise_if_cancelled() -> None:
        if callable(cancel_check) and cancel_check(synthetic_dataset_id):
            raise CancelledError("Generation cancelled by user")

    raise_if_cancelled()

    metadata = _build_metadata(df)
    num_rows = int(config.get("num_rows", len(df)))

    synthesizer = GaussianCopulaSynthesizer(
        metadata=metadata,
        enforce_min_max_values=True,
        enforce_rounding=True,
    )
    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 10, "running", "Initialized Gaussian Copula synthesizer")

    synthesizer.fit(df)
    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 60, "running", "Gaussian Copula training completed")

    synthetic_df = synthesizer.sample(num_rows=num_rows)
    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 80, "running", "Synthetic rows sampled")

    preserve_dtypes = bool(config.get("preserve_dtypes", True))
    if preserve_dtypes:
        synthetic_df = _preserve_dataframe_dtypes(synthetic_df, df)

    return synthetic_df
