import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import settings
from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase
from app.services.storage import storage_service
from app.services.schema_detector import detect_schema, SchemaDetectionError

router = APIRouter(prefix="/datasets", tags=["datasets"])

ALLOWED_EXTENSIONS = {".csv", ".json", ".parquet", ".xlsx"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a dataset file and create database record."""
    user_id = user["id"]
    filename = file.filename or "upload.csv"

    # Validate extension
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail="Unsupported file type"
        )

    # Read file content
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Validate size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")

    # Generate dataset ID and sanitize filename
    dataset_id = str(uuid.uuid4())
    safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)[:100]
    storage_path = f"{user_id}/{dataset_id}/{safe_filename}"

    # Detect MIME type from extension
    mime_map = {
        ".csv": "text/csv",
        ".json": "application/json",
        ".parquet": "application/vnd.apache.parquet",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    file_type = mime_map.get(ext, "application/octet-stream")

    try:
        # Upload to storage
        storage_service.upload_file(
            bucket="datasets",
            path=storage_path,
            file_bytes=file_bytes,
            content_type=file_type,
        )

        # Detect schema
        schema_info = detect_schema(file_bytes, file_type)

        supabase = get_supabase()
        dataset_data = {
            "id": dataset_id,
            "user_id": user_id,
            "name": safe_filename,
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
    """List all datasets for the authenticated user. Returns raw array."""
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
    """Get a single dataset by ID."""
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
    return response.data[0]


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(dataset_id: str, user: dict = Depends(get_current_user)):
    """Delete a dataset and its associated file."""
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
