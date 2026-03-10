from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================
# Enums
# ============================================================

class DatasetStatus(str, Enum):
    uploaded = "uploaded"
    processing = "processing"
    ready = "ready"
    error = "error"


class SyntheticStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class GenerationMethod(str, Enum):
    ctgan = "ctgan"
    gaussian_copula = "gaussian_copula"
    tvae = "tvae"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ReportType(str, Enum):
    gdpr = "gdpr"
    hipaa = "hipaa"
    combined = "combined"


class PurchaseStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


# ============================================================
# Dataset Schemas
# ============================================================

class DatasetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class DatasetCreate(DatasetBase):
    pass


class DatasetResponse(DatasetBase):
    id: str
    user_id: str
    file_path: str
    file_size: int
    file_type: str
    row_count: int
    column_count: int
    schema: Dict[str, Any]
    status: DatasetStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DatasetListResponse(BaseModel):
    datasets: List[DatasetResponse]
    total: int


# ============================================================
# Synthetic Dataset Schemas
# ============================================================

class SyntheticDatasetCreate(BaseModel):
    original_dataset_id: str
    generation_method: GenerationMethod
    config: Optional[Dict[str, Any]] = None


class SyntheticDatasetResponse(BaseModel):
    id: str
    original_dataset_id: str
    user_id: str
    generation_method: GenerationMethod
    file_path: Optional[str] = None
    row_count: Optional[int] = None
    status: SyntheticStatus
    job_id: Optional[str] = None
    progress: int = 0
    config: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Privacy Score Schemas
# ============================================================

class PrivacyScoreResponse(BaseModel):
    id: str
    synthetic_dataset_id: str
    overall_score: float
    pii_detected: Dict[str, Any]
    risk_level: RiskLevel
    details: Dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Compliance Report Schemas
# ============================================================

class ComplianceReportResponse(BaseModel):
    id: str
    synthetic_dataset_id: str
    report_type: ReportType
    file_path: Optional[str] = None
    passed: bool
    findings: Dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Quality Report Schemas
# ============================================================

class QualityReportResponse(BaseModel):
    id: str
    synthetic_dataset_id: str
    correlation_score: float
    distribution_score: float
    overall_score: float
    column_stats: Dict[str, Any]
    passed: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Marketplace Schemas
# ============================================================

class MarketplaceListingCreate(BaseModel):
    synthetic_dataset_id: str
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    price: float = Field(..., gt=0)
    currency: str = "NGN"


class MarketplaceListingResponse(BaseModel):
    id: str
    seller_id: str
    synthetic_dataset_id: str
    title: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    price: float
    currency: str
    is_active: bool
    download_count: int
    preview_schema: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Purchase Schemas
# ============================================================

class PurchaseCreate(BaseModel):
    listing_id: str
    flutterwave_tx_ref: str


class PurchaseVerify(BaseModel):
    tx_ref: str


class PurchaseResponse(BaseModel):
    id: str
    buyer_id: str
    listing_id: str
    amount: float
    currency: str
    flutterwave_tx_ref: str
    flutterwave_tx_id: Optional[str] = None
    status: PurchaseStatus
    created_at: datetime
    download_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# API Key Schemas
# ============================================================

class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: List[str] = ["generate", "read"]
    expires_at: Optional[datetime] = None


class ApiKeyResponse(BaseModel):
    id: str
    user_id: str
    name: str
    key_prefix: str
    scopes: List[str]
    usage_count: int
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ApiKeyCreateResponse(ApiKeyResponse):
    """Response when creating a new API key - includes the full key once."""
    key: str


# ============================================================
# Error Response
# ============================================================

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


# ============================================================
# Health Check
# ============================================================

class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
    timestamp: datetime
