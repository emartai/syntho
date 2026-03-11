import io
import os

import modal
import pandas as pd
from fastapi import Header, HTTPException

from modal_ml.compliance_reporter import compliance_reporter
from modal_ml.correlation_validator import correlation_validator
from modal_ml.ctgan_generator import CancelledError, generate_ctgan
from modal_ml.privacy_scorer import privacy_scorer
from modal_ml.quality_reporter import quality_reporter
from modal_ml.sdv_generator import generate_gaussian_copula
from modal_ml.utils import (
    download_from_storage,
    log_job_event,
    supabase_client,
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


def _dispatch_generator(method: str):
    if method == "ctgan":
        return generate_ctgan
    if method == "gaussian_copula":
        return generate_gaussian_copula
    raise ValueError(f"Unsupported generation method: {method}")


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


@app.function(
    image=ml_image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("syntho-secrets")],
)
async def generate_synthetic(payload: dict):
    synthetic_dataset_id = payload["synthetic_dataset_id"]

    def is_job_cancelled(dataset_id: str) -> bool:
        response = (
            supabase_client()
            .table("synthetic_datasets")
            .select("status")
            .eq("id", dataset_id)
            .single()
            .execute()
        )
        return (response.data or {}).get("status") == "failed"

    def raise_if_cancelled() -> None:
        if is_job_cancelled(synthetic_dataset_id):
            raise CancelledError("Generation cancelled by user")

    def update_running_progress(progress: int, message: str) -> None:
        raise_if_cancelled()
        update_job_progress(synthetic_dataset_id, progress, "running", message)

    try:
        update_running_progress(5, "Job started")
        log_job_event(synthetic_dataset_id, "started", "Synthetic generation started")

        source_bytes = download_from_storage("datasets", payload["original_file_path"])
        update_running_progress(20, "Downloaded source dataset")

        source_df = _load_source_dataframe(
            source_bytes,
            payload["original_file_path"],
            payload.get("original_file_type"),
        )

        generator = _dispatch_generator(payload["method"])
        generator_config = dict(payload.get("config", {}))
        generator_config["_cancel_check"] = is_job_cancelled

        if payload["method"] == "gaussian_copula":
            synthetic_df = generator(source_df, generator_config, synthetic_dataset_id)
        else:
            generated = generator(source_df, generator_config, synthetic_dataset_id)
            synthetic_df = generated if isinstance(generated, pd.DataFrame) else pd.DataFrame(generated)

        raise_if_cancelled()
        output_path = f"{payload['user_id']}/{synthetic_dataset_id}/data.csv"
        output_bytes = synthetic_df.to_csv(index=False).encode("utf-8")
        upload_to_storage("synthetic", output_path, output_bytes, "text/csv")

        raise_if_cancelled()
        supabase = supabase_client()
        supabase.table("synthetic_datasets").update(
            {
                "status": "running",
                "file_path": output_path,
                "row_count": len(synthetic_df),
            }
        ).eq("id", synthetic_dataset_id).execute()

        update_running_progress(92, "Scoring privacy")
        privacy_scorer(synthetic_df, {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id})
        correlation_validator(synthetic_df, {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id})
        quality_reporter(synthetic_df, {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id})
        compliance_reporter(synthetic_df, {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id})

        update_job_progress(synthetic_dataset_id, 100, "completed", "Synthetic generation completed")
        log_job_event(synthetic_dataset_id, "completed", "Synthetic dataset generation completed")

    except CancelledError as exc:
        update_job_progress(synthetic_dataset_id, 100, "failed", str(exc))
        log_job_event(synthetic_dataset_id, "cancelled", str(exc))
        return

    except Exception as exc:
        update_job_progress(synthetic_dataset_id, 100, "failed", str(exc))
        log_job_event(synthetic_dataset_id, "failed", str(exc))
        raise
