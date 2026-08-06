from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Auth Schemas ---

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: Optional[str] = "verifier"

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool

# --- Template & Field Schemas ---

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class TemplateFieldCreate(BaseModel):
    field_key: str
    label: str
    data_type: str = "text"
    bounding_box: BoundingBox
    is_required: bool = True
    validation_regex: Optional[str] = None
    confidence_threshold: float = 0.75

class TemplateCreate(BaseModel):
    document_type_id: str
    name: str
    sample_image_path: Optional[str] = None
    width: int = 1240
    height: int = 1754
    fields: List[TemplateFieldCreate]

# --- Document Upload & Processing Schemas ---

class DocumentUploadResponse(BaseModel):
    document_id: str
    file_name: str
    status: str
    document_type_id: Optional[str] = None
    quality_checks: Dict[str, Any]
    created_at: datetime

class FieldCorrectionItem(BaseModel):
    field_key: str
    corrected_value: str
    correction_reason: Optional[str] = None

class HumanCorrectionRequest(BaseModel):
    document_id: str
    corrections: List[FieldCorrectionItem]

# --- Metrics & Export Schemas ---

class DashboardMetricsResponse(BaseModel):
    total_documents: int
    verified_documents: int
    pending_verification: int
    avg_confidence: float
    cer_percentage: float
    wer_percentage: float
    field_accuracy_percentage: float

class ExportRequest(BaseModel):
    format: str  # csv, json, excel
    document_type_code: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
