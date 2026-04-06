import io
import os

import modal
from fastapi import Header, HTTPException

app = modal.App("syntho-ml")

ml_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        [
            "sdv==1.9.0",
            "ctgan>=0.8,<0.9",
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
    .add_local_dir("modal_ml", remote_path="/usr/local/lib/python3.11/site-packages/modal_ml")
)


def _dispatch_generator(method: str):
    from modal_ml.ctgan_generator import generate_ctgan
    from modal_ml.sdv_generator import generate_gaussian_copula

    if method == "ctgan":
        return generate_ctgan
    if method == "gaussian_copula":
        return generate_gaussian_copula
    raise ValueError(f"Unsupported generation method: {method}")


def _load_source_dataframe(file_bytes: bytes, file_path: str, file_type: str | None = None):
    import pandas as pd

    extension = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""

    if file_type == "text/csv" or extension == "csv":
        return pd.read_csv(io.BytesIO(file_bytes))

    if file_type == "application/json" or extension == "json":
        return pd.read_json(io.BytesIO(file_bytes))

    if file_type == "application/vnd.apache.parquet" or extension == "parquet":
        return pd.read_parquet(io.BytesIO(file_bytes))

    if file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" or extension == "xlsx":
        return pd.read_excel(io.BytesIO(file_bytes))

    return pd.read_csv(io.BytesIO(file_bytes))


@app.function(
    image=ml_image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("syntho-secrets")],
)
@modal.web_endpoint(method="POST")
async def run_job(payload: dict, x_api_secret: str = Header(default="")):
    expected_secret = os.environ.get("MODAL_API_SECRET")
    provided_secret = x_api_secret or ""

    if expected_secret and provided_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    required_fields = {"synthetic_dataset_id", "dataset_file_path", "method", "config", "user_id"}
    missing = [field for field in required_fields if field not in payload]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    generate_synthetic.spawn(payload)
    return {"status": "accepted"}


@app.function(
    image=ml_image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("syntho-secrets")],
)
async def generate_synthetic(payload: dict):
    import pandas as pd
    from modal_ml.compliance_reporter import compliance_reporter
    from modal_ml.ctgan_generator import CancelledError
    from modal_ml.privacy_scorer import score_privacy
    from modal_ml.quality_reporter import quality_reporter
    from modal_ml.utils import (
        download_from_storage,
        log_job_event,
        supabase_client,
        update_job_progress,
        upload_to_storage,
        increment_jobs_used_this_month,
        create_notification,
    )

    synthetic_dataset_id = payload["synthetic_dataset_id"]
    user_id = payload["user_id"]

    def _label(score: float) -> str:
        if score >= 85:
            return "Excellent"
        if score >= 70:
            return "Good"
        if score >= 50:
            return "Fair"
        return "Needs Improvement"

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
            raise CancelledError("Cancelled by user")

    try:
        update_job_progress(synthetic_dataset_id, 5, "running", "Starting job")
        log_job_event(synthetic_dataset_id, "started", "Synthetic generation started")

        source_bytes = download_from_storage("datasets", payload["dataset_file_path"])
        raise_if_cancelled()

        source_df = _load_source_dataframe(
            source_bytes,
            payload["dataset_file_path"],
            payload.get("dataset_file_type"),
        )

        generator = _dispatch_generator(payload["method"])
        generator_config = dict(payload.get("config", {}))
        generator_config["_cancel_check"] = is_job_cancelled

        generated = generator(source_df, generator_config, synthetic_dataset_id)
        synthetic_df = generated if isinstance(generated, pd.DataFrame) else pd.DataFrame(generated)

        raise_if_cancelled()
        output_path = f"{user_id}/{synthetic_dataset_id}/data.csv"
        output_bytes = synthetic_df.to_csv(index=False).encode("utf-8")
        upload_to_storage("synthetic", output_path, output_bytes, "text/csv")

        supabase = supabase_client()
        supabase.table("synthetic_datasets").update(
            {
                "status": "running",
                "file_path": output_path,
                "row_count": len(synthetic_df),
            }
        ).eq("id", synthetic_dataset_id).execute()

        update_job_progress(synthetic_dataset_id, 85, "running", "Running privacy scoring")
        privacy_result = score_privacy(source_df, synthetic_df, synthetic_dataset_id) or {}
        update_job_progress(synthetic_dataset_id, 90, "running", "Running quality scoring")
        quality_result = quality_reporter(source_df, synthetic_df, {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id}) or {}
        update_job_progress(synthetic_dataset_id, 95, "running", "Running compliance checks")
        compliance_result = compliance_reporter(source_df, synthetic_df, {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id}) or {}

        privacy_score = float(privacy_result.get("overall_score", 0) or 0)
        fidelity_score = float(quality_result.get("overall_score", 0) or 0)
        compliance_score = 100.0 if compliance_result.get("passed", False) else 0.0
        composite_score = max(0.0, min(100.0, (privacy_score * 0.40) + (fidelity_score * 0.40) + (compliance_score * 0.20)))

        trust_payload = {
            "synthetic_dataset_id": synthetic_dataset_id,
            "composite_score": round(composite_score, 2),
            "privacy_weight": 40.0,
            "fidelity_weight": 40.0,
            "compliance_weight": 20.0,
            "label": _label(composite_score),
        }

        existing = (
            supabase.table("trust_scores")
            .select("id")
            .eq("synthetic_dataset_id", synthetic_dataset_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            supabase.table("trust_scores").update(trust_payload).eq("synthetic_dataset_id", synthetic_dataset_id).execute()
        else:
            supabase.table("trust_scores").insert(trust_payload).execute()

        update_job_progress(synthetic_dataset_id, 100, "completed", "Done")
        increment_jobs_used_this_month(user_id)
        log_job_event(synthetic_dataset_id, "completed", "Synthetic dataset generation completed")
        create_notification(
            user_id=user_id,
            type="job_complete",
            title="Your synthetic dataset is ready",
            message="Generation completed successfully.",
            link=f"/datasets/{synthetic_dataset_id}",
        )

    except CancelledError as exc:
        update_job_progress(synthetic_dataset_id, 0, "failed", str(exc))
        log_job_event(synthetic_dataset_id, "cancelled", str(exc))
        create_notification(
            user_id=user_id,
            type="job_failed",
            title="Generation failed — cancelled",
            message=str(exc),
            link=f"/generate/{payload.get('original_dataset_id', '')}",
        )
    except Exception as exc:
        update_job_progress(synthetic_dataset_id, 0, "failed", str(exc))
        log_job_event(synthetic_dataset_id, "failed", str(exc))
        create_notification(
            user_id=user_id,
            type="job_failed",
            title="Generation failed",
            message=str(exc),
            link=f"/generate/{payload.get('original_dataset_id', '')}",
        )
        raise
