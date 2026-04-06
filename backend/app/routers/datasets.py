import mimetypes
import os
import re
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase
from app.services.storage import storage_service
from app.services.schema_detector import detect_schema, SchemaDetectionError

router = APIRouter(prefix="/datasets", tags=["datasets"])

ALLOWED_EXTENSIONS = {".csv", ".json", ".parquet", ".xlsx"}
ALLOWED_MIME_TYPES = {
    "text/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/json",
    "application/vnd.apache.parquet",
    "application/octet-stream",  # some parquet uploads
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",  # common xlsx detector output
}

FREE_MAX_FILE_SIZE = 50 * 1024 * 1024
PAID_MAX_FILE_SIZE = 500 * 1024 * 1024

try:
    import magic  # type: ignore
except ImportError:
    magic = None


def detect_mime_type(file_bytes: bytes, filename: str, declared_content_type: str | None) -> str:
    if magic is not None:
        try:
            detected = magic.from_buffer(file_bytes, mime=True)
            if detected:
                return detected
        except Exception:
            pass

    guessed, _ = mimetypes.guess_type(filename)
    if guessed:
        return guessed

    if declared_content_type:
        return declared_content_type

    return "application/octet-stream"


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    description: str | None = Form(default=None),
    user: dict = Depends(get_current_user),
):
    user_id = user["id"]
    filename = file.filename or "upload.csv"

    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    file_bytes = await file.read()
    file_size = len(file_bytes)

    supabase = get_supabase()
    profile_resp = (
        supabase.table("profiles")
        .select("plan")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    plan = profile_resp.data[0].get("plan", "free") if profile_resp.data else "free"
    max_size = FREE_MAX_FILE_SIZE if plan == "free" else PAID_MAX_FILE_SIZE

    if file_size > max_size:
        limit_mb = 50 if plan == "free" else 500
        raise HTTPException(status_code=413, detail=f"File exceeds {limit_mb}MB limit for your plan")

    detected_mime = detect_mime_type(file_bytes, filename, file.content_type)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported MIME type: {detected_mime}")

    dataset_id = str(uuid.uuid4())
    safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)[:100]
    random_file = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"{user_id}/{dataset_id}/{random_file}"

    try:
        storage_service.upload_file(
            bucket="datasets",
            path=storage_path,
            file_bytes=file_bytes,
            content_type=detected_mime,
        )

        schema_info = detect_schema(file_bytes, detected_mime, filename=filename)

        dataset_data = {
            "id": dataset_id,
            "user_id": user_id,
            "name": (name or os.path.splitext(safe_filename)[0])[:255],
            "description": description,
            "file_path": storage_path,
            "file_size": file_size,
            "file_type": ext.lstrip("."),
            "row_count": schema_info["row_count"],
            "column_count": schema_info["column_count"],
            "schema": schema_info,
            "status": "ready",
        }

        response = supabase.table("datasets").insert(dataset_data).execute()
        return response.data[0] if response.data else dataset_data

    except SchemaDetectionError as e:
        try:
            storage_service.delete_file("datasets", storage_path)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Failed to detect schema: {e}")
    except HTTPException:
        raise
    except Exception as e:
        try:
            storage_service.delete_file("datasets", storage_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to upload dataset: {e}")


@router.get("")
async def list_datasets(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("datasets")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.get("/{dataset_id}")
async def get_dataset(dataset_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("datasets")
        .select("*")
        .eq("id", dataset_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if response.data:
        dataset = response.data[0]
        synthetic_versions = (
            supabase.table("synthetic_datasets")
            .select("*")
            .eq("original_dataset_id", dataset_id)
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        return {
            **dataset,
            "type": "original",
            "synthetic_versions": synthetic_versions.data or [],
        }

    synthetic_response = (
        supabase.table("synthetic_datasets")
        .select("*")
        .eq("id", dataset_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not synthetic_response.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    synthetic_dataset = synthetic_response.data[0]

    original_dataset_resp = (
        supabase.table("datasets")
        .select("id,name,file_type,row_count,column_count,created_at")
        .eq("id", synthetic_dataset["original_dataset_id"])
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )

    def latest(table: str) -> dict | None:
        try:
            report = (
                supabase.table(table)
                .select("*")
                .eq("synthetic_dataset_id", dataset_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return report.data[0] if report.data else None
        except Exception:
            return None

    return {
        **synthetic_dataset,
        "type": "synthetic",
        "original_dataset": original_dataset_resp.data[0] if original_dataset_resp.data else None,
        "trust_score": latest("trust_scores"),
        "privacy_score": latest("privacy_scores"),
        "quality_report": latest("quality_reports"),
        "compliance_report": latest("compliance_reports"),
    }


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(dataset_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("datasets")
        .select("*")
        .eq("id", dataset_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dataset = response.data[0]
    try:
        storage_service.delete_file("datasets", dataset["file_path"])
    except Exception:
        pass

    supabase.table("datasets").delete().eq("id", dataset_id).execute()
    return None


@router.get("/{dataset_id}/download")
async def download_dataset(dataset_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("datasets")
        .select("id,file_path,name")
        .eq("id", dataset_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dataset = response.data[0]
    signed_url = storage_service.get_signed_url("datasets", dataset["file_path"], expires_in=300)
    return {"download_url": signed_url, "name": dataset.get("name")}
