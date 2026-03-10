import importlib
import io
import os
from typing import Any, Callable

import modal
import pandas as pd
from fastapi import Header, HTTPException

from modal_ml.utils import (
    download_from_storage,
    log_job_event,
    update_job_progress,
    upload_to_storage,
)


app = modal.App("syntho-ml")

ml_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        [
            "sdv==1.9.0",
            "ctgan==0.7.5",
            "scikit-learn",
            "scipy",
            "presidio-analyzer",
            "presidio-anonymizer",
            "ydata-profiling",
            "matplotlib",
            "seaborn",
            "reportlab",
            "supabase",
            "pandas",
            "pyarrow",
            "fastapi",
        ]
    )
    .run_commands(["python -m spacy download en_core_web_lg"])
)


def _load_callable(module_name: str, fallback_name: str) -> Callable[..., Any] | None:
    try:
        module = importlib.import_module(module_name)
    except Exception:
        return None

    for candidate in (fallback_name, "run", "generate", module_name.split(".")[-1]):
        fn = getattr(module, candidate, None)
        if callable(fn):
            return fn

    return None


def _dispatch_generator(method: str) -> Callable[..., Any]:
    if method == "ctgan":
        func = _load_callable("modal_ml.ctgan_generator", "ctgan_generator")
    elif method == "gaussian_copula":
        func = _load_callable("modal_ml.sdv_generator", "sdv_generator")
    else:
        raise ValueError(f"Unsupported generation method: {method}")

    if not func:
        raise RuntimeError(f"Generator implementation not found for method: {method}")
    return func


def _run_analysis_step(module_name: str, dataframe: pd.DataFrame, context: dict[str, Any]) -> None:
    func = _load_callable(module_name, module_name.split(".")[-1])
    if not func:
        return

    try:
        func(dataframe, context)
    except TypeError:
        func(dataframe)


@app.function(
    image=ml_image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("syntho-secrets")],
)
@modal.web_endpoint(method="POST")
async def run_job(payload: dict, x_api_secret: str = Header(default="")):
    expected_secret = os.environ.get("MODAL_API_SECRET")
    if not expected_secret:
        raise HTTPException(status_code=500, detail="Server secret not configured")

    provided_secret = x_api_secret or payload.get("api_secret")
    if provided_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    required_fields = {"synthetic_dataset_id", "original_file_path", "method", "config", "user_id"}
    missing = [field for field in required_fields if field not in payload]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    call = generate_synthetic.spawn(payload)
    return {"status": "accepted", "job_id": call.object_id}


def _load_source_dataframe(file_bytes: bytes, file_path: str, file_type: str | None = None) -> pd.DataFrame:
    extension = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""

    if file_type == "text/csv" or extension == "csv":
        return pd.read_csv(io.BytesIO(file_bytes))

    if file_type == "application/json" or extension == "json":
        return pd.read_json(io.BytesIO(file_bytes))

    if file_type == "application/vnd.apache.parquet" or extension == "parquet":
        return pd.read_parquet(io.BytesIO(file_bytes))

    if file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" or extension == "xlsx":
        return pd.read_excel(io.BytesIO(file_bytes))

    try:
        return pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError(f"Unsupported or unreadable source dataset format for path: {file_path}") from exc


@app.function(
    image=ml_image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("syntho-secrets")],
)
async def generate_synthetic(payload: dict):
    synthetic_dataset_id = payload["synthetic_dataset_id"]

    try:
        update_job_progress(synthetic_dataset_id, 5, "running", "Job started")
        log_job_event(synthetic_dataset_id, "started", "Synthetic generation started")

        source_bytes = download_from_storage("datasets", payload["original_file_path"])
        update_job_progress(synthetic_dataset_id, 20, "running", "Downloaded source dataset")

        source_df = _load_source_dataframe(
            source_bytes,
            payload["original_file_path"],
            payload.get("original_file_type"),
        )
        generator = _dispatch_generator(payload["method"])

        generated = generator(source_df, payload.get("config", {}))
        synthetic_df = generated if isinstance(generated, pd.DataFrame) else pd.DataFrame(generated)
        update_job_progress(synthetic_dataset_id, 60, "running", "Synthetic dataset generated")

        analysis_context = {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id}
        _run_analysis_step("modal_ml.privacy_scorer", synthetic_df, analysis_context)
        _run_analysis_step("modal_ml.correlation_validator", synthetic_df, analysis_context)
        _run_analysis_step("modal_ml.quality_reporter", synthetic_df, analysis_context)
        _run_analysis_step("modal_ml.compliance_reporter", synthetic_df, analysis_context)

        output_path = f"{payload['user_id']}/{synthetic_dataset_id}/synthetic.csv"
        output_bytes = synthetic_df.to_csv(index=False).encode("utf-8")
        upload_to_storage("synthetic", output_path, output_bytes, "text/csv")

        update_job_progress(synthetic_dataset_id, 100, "completed", "Synthetic generation completed")
        log_job_event(synthetic_dataset_id, "completed", "Synthetic dataset generation completed")

    except Exception as exc:
        update_job_progress(synthetic_dataset_id, 100, "failed", str(exc))
        log_job_event(synthetic_dataset_id, "failed", str(exc))
        raise
