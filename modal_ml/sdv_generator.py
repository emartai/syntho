from __future__ import annotations

from typing import Any

import pandas as pd
from sdv.metadata import SingleTableMetadata
from sdv.single_table import GaussianCopulaSynthesizer

from modal_ml.ctgan_generator import CancelledError
from modal_ml.utils import update_job_progress

FREE_ROW_CAP = 10_000


def _build_metadata(df: pd.DataFrame) -> SingleTableMetadata:
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(data=df)

    for column in df.columns:
        series = df[column]
        lower_name = column.lower()

        if series.is_unique and series.notna().all() and (
            lower_name == "id" or lower_name.endswith("_id") or lower_name.endswith("id")
        ):
            metadata.update_column(column_name=column, sdtype="id")

        if pd.api.types.is_bool_dtype(series):
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


def _fit_with_constant_column_retry(
    df: pd.DataFrame,
    synthesizer: GaussianCopulaSynthesizer,
) -> tuple[pd.DataFrame, list[str]]:
    try:
        synthesizer.fit(df)
        return df, []
    except Exception as first_exc:
        constant_columns = [c for c in df.columns if df[c].dropna().nunique() <= 1]
        if not constant_columns:
            raise

        retried_df = df.drop(columns=constant_columns)
        if retried_df.empty or retried_df.shape[1] == 0:
            raise ValueError("All columns are constant; cannot fit Gaussian Copula model") from first_exc

        retry_metadata = _build_metadata(retried_df)
        retry_synthesizer = GaussianCopulaSynthesizer(
            metadata=retry_metadata,
            enforce_min_max_values=True,
            enforce_rounding=True,
        )
        retry_synthesizer.fit(retried_df)
        return retried_df, constant_columns


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
            raise CancelledError("Cancelled by user")

    raise_if_cancelled()

    metadata = _build_metadata(df)
    synthesizer = GaussianCopulaSynthesizer(
        metadata=metadata,
        enforce_min_max_values=True,
        enforce_rounding=True,
    )

    update_job_progress(synthetic_dataset_id, 10, "running", "Fitting model")
    fit_df, dropped_constant_columns = _fit_with_constant_column_retry(df, synthesizer)

    if dropped_constant_columns:
        metadata = _build_metadata(fit_df)
        synthesizer = GaussianCopulaSynthesizer(
            metadata=metadata,
            enforce_min_max_values=True,
            enforce_rounding=True,
        )
        synthesizer.fit(fit_df)

    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 60, "running", "Generating data")

    num_rows = int(config.get("num_rows", len(df)))
    is_free_plan = bool(config.get("is_free_plan") or config.get("free_plan") or config.get("plan") == "free")
    if is_free_plan:
        num_rows = min(num_rows, FREE_ROW_CAP)

    synthetic_df = synthesizer.sample(num_rows=num_rows)

    if dropped_constant_columns:
        for column in dropped_constant_columns:
            synthetic_df[column] = df[column].iloc[0]

    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 80, "running", "Validating output")

    preserve_dtypes = bool(config.get("preserve_dtypes", True))
    if preserve_dtypes:
        synthetic_df = _preserve_dataframe_dtypes(synthetic_df, df)

    return synthetic_df[df.columns.tolist()]
