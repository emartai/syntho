import uuid
import time
from datetime import datetime
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, Request
from pydantic import BaseModel, Field
import httpx

from app.middleware.auth import get_current_user_or_api_key, require_scope
from app.services.supabase import get_supabase
from app.services.storage import storage_service, get_signed_download_url
from app.services.schema_detector import detect_schema, SchemaDetectionError
from app.services.modal_client import trigger_modal_job
from app.config import settings
import magic


router = APIRouter(prefix="/api/v1/ext", tags=["external-api"])


def generate_request_id() -> str:
    """Generate a unique request ID for tracing."""
    return str(uuid.uuid4())


def success_response(data: Any, request_id: str) -> dict:
    """Standard success response format."""
    return {
        "success": True,
        "data": data,
        "meta": {
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }


def error_response(code: str, message: str, request_id: str) -> dict:
    """Standard error response format."""
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
        "meta": {
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }


# ============================================================
# Dataset Management
# ============================================================

class UploadDatasetResponse(BaseModel):
    dataset_id: str
    name: str
    file_size: int
    file_type: str
    row_count: int
    column_count: int
    schema: dict
    status: str
    created_at: str


class DatasetListItem(BaseModel):
    id: str
    name: str
    file_size: int
    file_type: str
    row_count: int
    column_count: int
    status: str
    created_at: str


class DatasetListResponse(BaseModel):
    datasets: list[DatasetListItem]
    total: int
    page: int
    per_page: int


def detect_file_type(file_bytes: bytes, filename: str) -> str:
    """Detect file MIME type - check extension first, then magic bytes."""
    # Check file extension first
    if filename.endswith('.csv'):
        return 'text/csv'
    elif filename.endswith('.json'):
        return 'application/json'
    elif filename.endswith('.parquet'):
        return 'application/vnd.apache.parquet'
    elif filename.endswith('.xlsx'):
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    
    # Fallback to magic bytes
    try:
        mime = magic.from_buffer(file_bytes[:2048], mime=True)
        return mime
    except Exception:
        return 'application/octet-stream'


@router.post("/datasets", response_model=UploadDatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
):
    """
    Upload a dataset file for synthetic data generation.
    
    - Accepts CSV, JSON, Parquet, and Excel files
    - Maximum file size: 100MB
    - Automatically detects schema and column types
    """
    request_id = generate_request_id()
    
    user_id = await get_current_user_or_api_key(request)
    api_key_scopes = getattr(request.state, "api_key_scopes", [])
    is_api_key = bool(api_key_scopes)
    
    if is_api_key and "generate" not in api_key_scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key requires 'generate' scope",
        )
    
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    if file_size > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size / 1024 / 1024}MB",
        )
    
    file_type = detect_file_type(file_bytes, file.filename)
    if file_type not in settings.allowed_file_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_type} not allowed. Supported types: {', '.join(settings.allowed_file_types)}",
        )
    
    supabase = get_supabase()
    dataset_id = str(uuid.uuid4())
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'dat'
    storage_path = f"{user_id}/{dataset_id}/{dataset_id}.{file_extension}"
    
    try:
        storage_service.upload_file(
            bucket=settings.datasets_bucket,
            path=storage_path,
            file_bytes=file_bytes,
            content_type=file_type,
        )
        
        schema_info = detect_schema(file_bytes, file_type)
        
        dataset_data = {
            "id": dataset_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "file_path": storage_path,
            "file_size": file_size,
            "file_type": file_type,
            "row_count": schema_info["row_count"],
            "column_count": schema_info["column_count"],
            "schema": schema_info,
            "status": "ready",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        
        supabase.table("datasets").insert(dataset_data).execute()
        
        return {
            "dataset_id": dataset_id,
            "name": name,
            "file_size": file_size,
            "file_type": file_type,
            "row_count": schema_info["row_count"],
            "column_count": schema_info["column_count"],
            "schema": schema_info,
            "status": "ready",
            "created_at": dataset_data["created_at"],
        }
        
    except SchemaDetectionError as e:
        try:
            storage_service.delete_file(settings.datasets_bucket, storage_path)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to detect schema: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        try:
            storage_service.delete_file(settings.datasets_bucket, storage_path)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload dataset: {str(e)}",
        )


@router.get("/datasets", response_model=DatasetListResponse)
async def list_datasets(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """
    List all datasets for the authenticated user or API key.
    """
    request_id = generate_request_id()
    
    user_id = await get_current_user_or_api_key(request)
    
    supabase = get_supabase()
    
    offset = (page - 1) * per_page
    
    response = supabase.table("datasets").select(
        "id,name,file_size,file_type,row_count,column_count,status,created_at",
        count="exact",
    ).eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    
    return {
        "datasets": response.data,
        "total": response.count or 0,
        "page": page,
        "per_page": per_page,
    }


@router.get("/datasets/{dataset_id}")
async def get_dataset(
    request: Request,
    dataset_id: str,
):
    """
    Get a single dataset by ID with full schema information.
    """
    request_id = generate_request_id()
    
    user_id = await get_current_user_or_api_key(request)
    
    supabase = get_supabase()
    
    response = supabase.table("datasets").select("*").eq("id", dataset_id).eq("user_id", user_id).single().execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )
    
    return response.data


# ============================================================
# Generation
# ============================================================

class GenerationConfig(BaseModel):
    num_rows: Optional[int] = Field(None, ge=1, le=1000000)
    epochs: Optional[int] = Field(None, ge=1, le=1000)


class CreateGenerationRequest(BaseModel):
    dataset_id: str
    method: str = Field(..., pattern="^(ctgan|gaussian_copula|tvae)$")
    config: Optional[GenerationConfig] = None


class CreateGenerationResponse(BaseModel):
    job_id: str
    synthetic_dataset_id: str
    status: str
    created_at: str


@router.post("/generate", response_model=CreateGenerationResponse, status_code=status.HTTP_201_CREATED)
async def create_generation_job(
    request: Request,
    body: CreateGenerationRequest,
):
    """
    Start a synthetic data generation job.
    
    - dataset_id: ID of the source dataset
    - method: Generation method (ctgan, gaussian_copula, tvae)
    - config: Optional configuration (num_rows, epochs)
    """
    request_id = generate_request_id()
    
    user_id = await get_current_user_or_api_key(request)
    api_key_scopes = getattr(request.state, "api_key_scopes", [])
    is_api_key = bool(api_key_scopes)
    
    if is_api_key and "generate" not in api_key_scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key requires 'generate' scope",
        )
    
    supabase = get_supabase()
    
    dataset_resp = supabase.table("datasets").select(
        "id,file_path,file_type,user_id"
    ).eq("id", body.dataset_id).eq("user_id", user_id).single().execute()
    
    if not dataset_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )
    
    synthetic_dataset_id = str(uuid.uuid4())
    config = body.config.model_dump() if body.config else {}
    
    synthetic_payload = {
        "id": synthetic_dataset_id,
        "original_dataset_id": body.dataset_id,
        "user_id": user_id,
        "generation_method": body.method,
        "config": config,
        "status": "pending",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    
    supabase.table("synthetic_datasets").insert(synthetic_payload).execute()
    
    modal_payload = {
        "synthetic_dataset_id": synthetic_dataset_id,
        "original_file_path": dataset_resp.data["file_path"],
        "original_file_type": dataset_resp.data.get("file_type"),
        "method": body.method,
        "config": config,
        "user_id": user_id,
    }
    
    try:
        job_id = trigger_modal_job(modal_payload)
    except HTTPException as exc:
        supabase.table("synthetic_datasets").update({
            "status": "failed",
            "error_message": exc.detail,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }).eq("id", synthetic_dataset_id).execute()
        raise
    
    supabase.table("synthetic_datasets").update({
        "job_id": job_id,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }).eq("id", synthetic_dataset_id).execute()
    
    return {
        "job_id": job_id,
        "synthetic_dataset_id": synthetic_dataset_id,
        "status": "pending",
        "created_at": synthetic_payload["created_at"],
    }


@router.get("/generate/{synthetic_dataset_id}/status")
async def get_generation_status(
    request: Request,
    synthetic_dataset_id: str,
):
    """
    Get the status of a generation job.
    
    Returns: status, progress, estimated_minutes_remaining
    """
    request_id = generate_request_id()
    
    user_id = await get_current_user_or_api_key(request)
    
    supabase = get_supabase()
    
    result = supabase.table("synthetic_datasets").select(
        "id,status,progress,error_message,created_at,updated_at"
    ).eq("id", synthetic_dataset_id).eq("user_id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found",
        )
    
    data = result.data
    estimated_remaining = None
    
    if data.get("status") == "running":
        progress = data.get("progress", 0)
        if progress > 0 and progress < 100:
            estimated_remaining = max(1, int((100 - progress) / 5))
    
    return {
        "synthetic_dataset_id": synthetic_dataset_id,
        "status": data.get("status"),
        "progress": data.get("progress"),
        "error_message": data.get("error_message"),
        "estimated_minutes_remaining": estimated_remaining,
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
    }


# ============================================================
# Results
# ============================================================

class ResultsResponse(BaseModel):
    synthetic_dataset_id: str
    status: str
    privacy_score: Optional[float] = None
    privacy_risk_level: Optional[str] = None
    quality_score: Optional[float] = None
    compliance_passed: Optional[bool] = None
    download_url: Optional[str] = None
    created_at: str


@router.get("/results/{synthetic_dataset_id}", response_model=ResultsResponse)
async def get_results(
    request: Request,
    synthetic_dataset_id: str,
):
    """
    Get all results for a synthetic dataset including privacy score, quality score, and compliance status.
    """
    request_id = generate_request_id()
    
    user_id = await get_current_user_or_api_key(request)
    
    supabase = get_supabase()
    
    synth_result = supabase.table("synthetic_datasets").select(
        "id,status,file_path,created_at"
    ).eq("id", synthetic_dataset_id).eq("user_id", user_id).single().execute()
    
    if not synth_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Synthetic dataset not found",
        )
    
    synth = synth_result.data
    response = {
        "synthetic_dataset_id": synthetic_dataset_id,
        "status": synth.get("status"),
        "created_at": synth.get("created_at"),
    }
    
    if synth.get("status") == "completed":
        privacy = supabase.table("privacy_scores").select(
            "overall_score,risk_level"
        ).eq("synthetic_dataset_id", synthetic_dataset_id).single().execute()
        
        quality = supabase.table("quality_reports").select(
            "overall_score"
        ).eq("synthetic_dataset_id", synthetic_dataset_id).single().execute()
        
        compliance = supabase.table("compliance_reports").select(
            "passed"
        ).eq("synthetic_dataset_id", synthetic_dataset_id).execute()
        
        response["privacy_score"] = privacy.data.get("overall_score") if privacy.data else None
        response["privacy_risk_level"] = privacy.data.get("risk_level") if privacy.data else None
        response["quality_score"] = quality.data.get("overall_score") if quality.data else None
        response["compliance_passed"] = any(r.get("passed") for r in compliance.data) if compliance.data else None
        
        if synth.get("file_path"):
            try:
                response["download_url"] = get_signed_download_url(
                    synth["file_path"],
                    settings.synthetic_bucket,
                    expires_in=3600,
                )
            except Exception:
                pass
    
    return response


@router.get("/results/{synthetic_dataset_id}/download")
async def download_results(
    request: Request,
    synthetic_dataset_id: str,
):
    """
    Redirect to a signed download URL for the synthetic dataset.
    """
    user_id = await get_current_user_or_api_key(request)
    
    supabase = get_supabase()
    
    synth_result = supabase.table("synthetic_datasets").select(
        "id,status,file_path"
    ).eq("id", synthetic_dataset_id).eq("user_id", user_id).single().execute()
    
    if not synth_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Synthetic dataset not found",
        )
    
    synth = synth_result.data
    
    if synth.get("status") != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Synthetic dataset is not ready for download",
        )
    
    if not synth.get("file_path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download file not found",
        )
    
    signed_url = get_signed_download_url(
        synth["file_path"],
        settings.synthetic_bucket,
        expires_in=3600,
    )
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=signed_url)


# ============================================================
# Health Check (no auth required)
# ============================================================

@router.get("/health")
async def health_check():
    """
    Health check endpoint for the external API.
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


from fastapi import Query
from typing import List