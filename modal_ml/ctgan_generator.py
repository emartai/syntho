from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Callable, Iterator

import pandas as pd
from sdv.metadata import SingleTableMetadata
from sdv.single_table import CTGANSynthesizer

from modal_ml.utils import supabase_client, update_job_progress


class CancelledError(RuntimeError):
    """Raised when a synthetic generation job is cancelled by the user."""


def _is_discrete_column(series: pd.Series) -> bool:
    if pd.api.types.is_object_dtype(series) or pd.api.types.is_bool_dtype(series):
        return True

    if pd.api.types.is_numeric_dtype(series):
        return series.nunique(dropna=True) < 20

    return False


def _detect_discrete_columns(df: pd.DataFrame) -> list[str]:
    return [column for column in df.columns if _is_discrete_column(df[column])]


def _is_job_cancelled(synthetic_dataset_id: str) -> bool:
    response = (
        supabase_client()
        .table("synthetic_datasets")
        .select("status")
        .eq("id", synthetic_dataset_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return (rows[0] if rows else {}).get("status") == "failed"


class _TrackingIter:
    """Tqdm-compatible iterator that emits progress and checks for cancellation."""

    def __init__(
        self,
        iterable,
        total_epochs: int,
        synthetic_dataset_id: str,
        on_epoch: Callable[[int, int], None],
        cancel_check: Callable[[str], bool],
    ) -> None:
        self._iter = iter(iterable)
        self._total_epochs = total_epochs
        self._synthetic_dataset_id = synthetic_dataset_id
        self._on_epoch = on_epoch
        self._cancel_check = cancel_check
        self._idx = 0

    def __iter__(self):
        return self

    def __next__(self):
        value = next(self._iter)
        self._idx += 1
        if self._idx % 10 == 0 or self._idx == self._total_epochs:
            if self._cancel_check(self._synthetic_dataset_id):
                raise CancelledError("Generation cancelled by user")
            self._on_epoch(self._idx, self._total_epochs)
        return value

    # tqdm interface stubs
    def set_description(self, *args, **kwargs):
        pass

    def update(self, *args, **kwargs):
        pass

    def close(self):
        pass

    def set_postfix(self, *args, **kwargs):
        pass


@contextmanager
def _patch_ctgan_progress(
    total_epochs: int,
    synthetic_dataset_id: str,
    on_epoch: Callable[[int, int], None],
    cancel_check: Callable[[str], bool],
) -> Iterator[None]:
    """Patch CTGAN's tqdm loop so we can emit progress and check cancellation every 10 epochs."""
    try:
        import ctgan.synthesizers.ctgan as ctgan_module
    except Exception:
        yield
        return

    original_tqdm = ctgan_module.tqdm

    def tracking_tqdm(iterable, *args, **kwargs):
        return _TrackingIter(iterable, total_epochs, synthetic_dataset_id, on_epoch, cancel_check)

    ctgan_module.tqdm = tracking_tqdm
    try:
        yield
    finally:
        ctgan_module.tqdm = original_tqdm


def generate_ctgan(df: pd.DataFrame, config: dict[str, Any], synthetic_dataset_id: str) -> pd.DataFrame:
    if df.empty:
        raise ValueError("Source dataframe is empty")

    num_rows = int(config.get("num_rows", len(df)))
    epochs = int(config.get("epochs", 300))
    pac = int(config.get("pac", 10))
    batch_size = int(config.get("batch_size", 500))
    # batch_size must be divisible by pac (CTGAN discriminator requirement)
    batch_size = max(pac, (batch_size // pac) * pac) if batch_size % pac != 0 else batch_size
    discrete_columns = _detect_discrete_columns(df)

    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(data=df)

    synthesizer = CTGANSynthesizer(
        metadata=metadata,
        epochs=epochs,
        batch_size=batch_size,
        pac=pac,
        verbose=True,
    )

    cancel_check = config.get("_cancel_check")
    if not callable(cancel_check):
        cancel_check = _is_job_cancelled

    def raise_if_cancelled() -> None:
        if cancel_check(synthetic_dataset_id):
            raise CancelledError("Generation cancelled by user")

    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 5, "running", "Initializing CTGAN")

    def on_epoch(current_epoch: int, total_epochs: int) -> None:
        progress = int(5 + (current_epoch / total_epochs) * 70)
        update_job_progress(synthetic_dataset_id, progress, "running", "Training model")

    with _patch_ctgan_progress(epochs, synthetic_dataset_id, on_epoch, cancel_check):
        synthesizer.fit(data=df)

    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 80, "running", "Generating data")
    synthetic_data = synthesizer.sample(num_rows=num_rows)
    raise_if_cancelled()
    update_job_progress(synthetic_dataset_id, 90, "running", "Data generation completed")

    return synthetic_data
