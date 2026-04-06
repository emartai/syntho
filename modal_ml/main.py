import io
import os
import secrets

import modal
from fastapi import Header, HTTPException

# Defer heavy imports to runtime to allow Modal CLI deployment
# These will be imported inside functions when needed


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
    # Import at runtime
    from modal_ml.ctgan_generator import generate_ctgan
    from modal_ml.sdv_generator import generate_gaussian_copula
    
    if method == "ctgan":
        return generate_ctgan
    if method == "gaussian_copula":
        return generate_gaussian_copula
    raise ValueError(f"Unsupported generation method: {method}")


def _load_source_dataframe(file_bytes: bytes, file_path: str, file_type: str | None = None):
    # Import at runtime
    import pandas as pd
    import io
    
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
@modal.fastapi_endpoint(method="POST")
async def run_job(payload: dict, x_api_secret: str = Header(default="")):
    expected_secret = os.environ.get("MODAL_API_SECRET")
    if not expected_secret:
        raise HTTPException(status_code=500, detail="Server secret not configured")

    provided_secret = x_api_secret or payload.get("api_secret", "")
    if not secrets.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")

    required_fields = {"synthetic_dataset_id", "dataset_file_path", "method", "config", "user_id"}
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
    # Import at runtime to avoid local import issues during deployment
    import pandas as pd
    from modal_ml.ctgan_generator import CancelledError
    from modal_ml.utils import (
        create_notification,
        download_from_storage,
        latest_record,
        log_job_event,
        supabase_client,
        update_job_progress,
        upload_to_storage,
    )
    from modal_ml.privacy_scorer import score_privacy
    from modal_ml.correlation_validator import correlation_validator
    from modal_ml.quality_reporter import quality_reporter
    from modal_ml.compliance_reporter import compliance_reporter
    
    synthetic_dataset_id = payload["synthetic_dataset_id"]
    user_id = payload["user_id"]

    def is_job_cancelled(dataset_id: str) -> bool:
        response = (
            supabase_client()
            .table("synthetic_datasets")
            .select("status")
            .eq("id", dataset_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return (rows[0] if rows else {}).get("status") == "failed"

    def raise_if_cancelled() -> None:
        if is_job_cancelled(synthetic_dataset_id):
            raise CancelledError("Generation cancelled by user")

    def update_running_progress(progress: int, message: str) -> None:
        raise_if_cancelled()
        update_job_progress(synthetic_dataset_id, progress, "running", message)

    def _log(event: str, message: str) -> None:
        try:
            log_job_event(synthetic_dataset_id, event, message)
        except Exception:
            pass  # job_logs table may not exist yet; non-fatal

    try:
        update_running_progress(5, "Job started")
        _log("started", "Synthetic generation started")

        source_path = payload.get("dataset_file_path") or payload.get("original_file_path")
        source_bytes = download_from_storage("datasets", source_path)
        update_running_progress(20, "Downloaded source dataset")

        source_df = _load_source_dataframe(
            source_bytes,
            source_path,
            payload.get("original_file_type"),
        )

        generator = _dispatch_generator(payload["method"])
        generator_config = dict(payload.get("config", {}))
        generator_config["_cancel_check"] = is_job_cancelled

        if payload["method"] == "gaussian_copula":
            synthetic_df = generator(source_df, generator_config, synthetic_dataset_id)
        else:
            import pandas as pd
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
        try:
            score_privacy(source_df, synthetic_df, synthetic_dataset_id)
        except Exception as _e:
            _log("warn", f"privacy scoring skipped: {_e}")
        try:
            correlation_validator(source_df, synthetic_df, {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id})
        except Exception as _e:
            _log("warn", f"correlation validator skipped: {_e}")
        try:
            quality_stats = quality_reporter(
                synthetic_df,
                {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id, "original_df": source_df},
            )
            if quality_stats:
                latest_quality = latest_record("quality_reports", synthetic_dataset_id) or {}
                supabase.table("quality_reports").upsert(
                    {
                        "synthetic_dataset_id": synthetic_dataset_id,
                        "correlation_score": latest_quality.get("correlation_score", 0),
                        "distribution_score": latest_quality.get("distribution_score", 0),
                        "overall_score": max(
                            float(latest_quality.get("overall_score") or 0),
                            float(quality_stats.get("overall_fidelity_score", 0)) * 100,
                        ),
                        "column_stats": {
                            **(latest_quality.get("column_stats") or {}),
                            **quality_stats,
                        },
                        "passed": latest_quality.get("passed", False),
                    },
                    on_conflict="synthetic_dataset_id",
                ).execute()
        except Exception as _e:
            _log("warn", f"quality reporter skipped: {_e}")
        try:
            compliance_reporter(
                source_df,
                synthetic_df,
                {"payload": payload, "synthetic_dataset_id": synthetic_dataset_id, "user_id": user_id},
            )
        except Exception as _e:
            _log("warn", f"compliance reporter skipped: {_e}")

        privacy_result = latest_record("privacy_scores", synthetic_dataset_id) or {}
        quality_result = latest_record("quality_reports", synthetic_dataset_id) or {}
        compliance_result = latest_record("compliance_reports", synthetic_dataset_id) or {}

        privacy_score = float(privacy_result.get("overall_score") or 0)
        fidelity_score = float(quality_result.get("overall_score") or 0)
        if compliance_result.get("passed") is True:
            compliance_score = 100.0
        elif compliance_result.get("gdpr_passed") or compliance_result.get("hipaa_passed"):
            compliance_score = 75.0
        else:
            compliance_score = 50.0 if compliance_result else 0.0

        composite_score = max(
            0.0,
            min(100.0, (privacy_score * 0.40) + (fidelity_score * 0.40) + (compliance_score * 0.20)),
        )
        if composite_score >= 90:
            label = "Excellent"
        elif composite_score >= 75:
            label = "Good"
        elif composite_score >= 60:
            label = "Fair"
        else:
            label = "Needs Improvement"

        try:
            supabase.table("trust_scores").upsert(
                {
                    "synthetic_dataset_id": synthetic_dataset_id,
                    "composite_score": round(composite_score, 2),
                    "privacy_weight": 40.0,
                    "fidelity_weight": 40.0,
                    "compliance_weight": 20.0,
                    "label": label,
                },
                on_conflict="synthetic_dataset_id",
            ).execute()
        except Exception as _e:
            _log("warn", f"trust score persistence skipped: {_e}")

        update_job_progress(synthetic_dataset_id, 100, "completed", "Synthetic generation completed")
        _log("completed", "Synthetic dataset generation completed")
        create_notification(
            user_id,
            "job_complete",
            "Your synthetic dataset is ready",
            "Your synthetic dataset, trust score, and compliance report are ready.",
            f"/datasets/{synthetic_dataset_id}",
        )

    except CancelledError as exc:
        update_job_progress(synthetic_dataset_id, 100, "failed", str(exc))
        _log("cancelled", str(exc))
        create_notification(
            user_id,
            "job_failed",
            "Generation cancelled",
            "Your synthetic generation job was cancelled.",
            f"/generate/{payload.get('original_dataset_id') or ''}",
        )
        return

    except Exception as exc:
        update_job_progress(synthetic_dataset_id, 100, "failed", str(exc))
        _log("failed", str(exc))
        create_notification(
            user_id,
            "job_failed",
            "Generation failed",
            "Your synthetic generation job failed. Please review the job details and try again.",
            f"/generate/{payload.get('original_dataset_id') or ''}",
        )
        raise
