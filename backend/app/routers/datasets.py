from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional
import uuid
from datetime import datetime
from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase
from app.services.storage import storage_service
from app.services.schema_detector import detect_schema, SchemaDetectionError
from app.models.schemas import DatasetResponse, DatasetListResponse, ErrorResponse
from app.config import settings
import magic


router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])


def detect_file_type(file_bytes: bytes, filename: str) -> str:
    """Detect file MIME type using magic bytes, with extension fallback for common types."""
    # First check extension for known types (magic sometimes misdetects CSV as text/plain)
    if filename.endswith('.csv'):
        return 'text/csv'
    elif filename.endswith('.json'):
        return 'application/json'
    elif filename.endswith('.parquet'):
        return 'application/vnd.apache.parquet'
    elif filename.endswith('.xlsx'):
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    
    # Then use magic bytes for other types
    try:
        mime = magic.from_buffer(file_bytes[:2048], mime=True)
        return mime
    except:
        return 'application/octet-stream'



@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user)
):
    """
    Upload a dataset file and create database record.
    
    - Validates file type and size
    - Uploads to Supabase Storage
    - Detects schema automatically
    - Creates dataset record in database
    """
    supabase = get_supabase()
    
    # Read file content
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    # Validate file size
    if file_size > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size / 1024 / 1024}MB"
        )
    
    # Detect and validate file type
    file_type = detect_file_type(file_bytes, file.filename)
    if file_type not in settings.allowed_file_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_type} not allowed. Supported types: {', '.join(settings.allowed_file_types)}"
        )
    
    # Generate dataset ID
    dataset_id = str(uuid.uuid4())
    
    # Create storage path: datasets/{user_id}/{dataset_id}/{filename}
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'dat'
    storage_path = f"{user_id}/{dataset_id}/{dataset_id}.{file_extension}"
    
    try:
        # Upload file to storage
        storage_service.upload_file(
            bucket=settings.datasets_bucket,
            path=storage_path,
            file_bytes=file_bytes,
            content_type=file_type
        )
        
        # Detect schema
        schema_info = detect_schema(file_bytes, file_type)
        
        # Create dataset record in database
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
            "created_at": datetime.utcnow().isoformat()
        }
        
        response = supabase.table("datasets").insert(dataset_data).execute()
        
        # Return response with schema
        return {
            "dataset_id": dataset_id,
            "name": name,
            "description": description,
            "file_size": file_size,
            "file_type": file_type,
            "row_count": schema_info["row_count"],
            "column_count": schema_info["column_count"],
            "schema": schema_info,
            "status": "ready",
            "created_at": dataset_data["created_at"]
        }
        
    except SchemaDetectionError as e:
        try:
            storage_service.delete_file(settings.datasets_bucket, storage_path)
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to detect schema: {str(e)}"
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Clean up uploaded file if database insert fails
        try:
            storage_service.delete_file(settings.datasets_bucket, storage_path)
        except:
            pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload dataset: {str(e)}"
        )


@router.get("", response_model=DatasetListResponse)
async def list_datasets(
    user_id: str = Depends(get_current_user),
    limit: int = 100,
    offset: int = 0
):
    """
    List all datasets for the authenticated user.
    """
    supabase = get_supabase()
    
    try:
        # Get datasets with pagination
        response = supabase.table("datasets") \
            .select("*", count="exact") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        return {
            "datasets": response.data,
            "total": response.count or 0
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch datasets: {str(e)}"
        )


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get a single dataset by ID.
    Only returns dataset if it belongs to the authenticated user.
    """
    supabase = get_supabase()
    
    try:
        response = supabase.table("datasets") \
            .select("*") \
            .eq("id", dataset_id) \
            .eq("user_id", user_id) \
            .limit(1) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dataset: {str(e)}"
        )


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Delete a dataset and its associated file.
    Only allows deletion if dataset belongs to the authenticated user.
    """
    supabase = get_supabase()
    
    try:
        # Get dataset to verify ownership and get file path
        response = supabase.table("datasets") \
            .select("*") \
            .eq("id", dataset_id) \
            .eq("user_id", user_id) \
            .limit(1) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )

        dataset = response.data[0]
        
        # Delete file from storage
        try:
            storage_service.delete_file(
                bucket=settings.datasets_bucket,
                path=dataset["file_path"]
            )
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Failed to delete file from storage: {str(e)}")
        
        # Delete dataset record from database
        supabase.table("datasets").delete().eq("id", dataset_id).execute()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete dataset: {str(e)}"
        )
