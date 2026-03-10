from __future__ import annotations

from typing import Any

import pandas as pd
from ctgan import CTGAN


def ctgan_generator(source_df: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Train CTGAN and sample a synthetic dataframe."""
    if source_df.empty:
        raise ValueError("Source dataframe is empty")

    epochs = int(config.get("epochs", 50))
    sample_size = int(config.get("sample_size", len(source_df)))

    model = CTGAN(epochs=epochs, verbose=False)
    model.fit(source_df)
    synthetic_df = model.sample(sample_size)

    return synthetic_df
