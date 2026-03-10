from __future__ import annotations

from typing import Any

import pandas as pd
from sdv.single_table import GaussianCopulaSynthesizer
from sdv.metadata import SingleTableMetadata


def sdv_generator(source_df: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Generate synthetic dataframe using SDV Gaussian Copula."""
    if source_df.empty:
        raise ValueError("Source dataframe is empty")

    sample_size = int(config.get("sample_size", len(source_df)))

    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(data=source_df)

    synthesizer = GaussianCopulaSynthesizer(metadata)
    synthesizer.fit(source_df)
    return synthesizer.sample(num_rows=sample_size)
