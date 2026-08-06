import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from .database import Base
import enum

# --- Enums ---

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    VERIFIER = "verifier"
    AUDITOR = "auditor"

class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PREPROCESSING = "preprocessing"
    OCR_PROCESSING = "ocr_processing"
    VERIFICATION_REQUIRED = "verification_required"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPORTED = "exported"

class ProcessingJobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class FieldDataType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    PHONE = "phone"
    VEHICLE_REG = "vehicle_reg"
    EMPLOYEE_ID = "employee_id"
    SELECT = "select"
    BOOLEAN = "boolean"

# --- Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.VERIFIER.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    corrections = relationship("HumanCorrection", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class DocumentType(Base):
    __tablename__ = "document_types"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    templates = relationship("DocumentTemplate", back_populates="document_type")
    documents = relationship("Document", back_populates="document_type")


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_type_id = Column(String(36), ForeignKey("document_types.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    version = Column(Integer, default=1)
    sample_image_path = Column(String(512), nullable=True)
    width = Column(Integer, default=1240)
    height = Column(Integer, default=1754)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document_type = relationship("DocumentType", back_populates="templates")
    fields = relationship("TemplateField", back_populates="template", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="template")


class TemplateField(Base):
    __tablename__ = "template_fields"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String(36), ForeignKey("document_templates.id", ondelete="CASCADE"), nullable=False)
    field_key = Column(String(100), nullable=False)
    label = Column(String(255), nullable=False)
    data_type = Column(String(50), default=FieldDataType.TEXT.value)
    bounding_box = Column(JSON, nullable=False)  # {"x": 10, "y": 20, "w": 300, "h": 50}
    is_required = Column(Boolean, default=True)
    validation_regex = Column(String(255), nullable=True)
    confidence_threshold = Column(Float, default=0.75)
    order_index = Column(Integer, default=0)

    template = relationship("DocumentTemplate", back_populates="fields")
    extracted_fields = relationship("ExtractedField", back_populates="template_field")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_type_id = Column(String(36), ForeignKey("document_types.id"), nullable=True)
    template_id = Column(String(36), ForeignKey("document_templates.id"), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    mime_type = Column(String(100), default="image/png")
    file_size_bytes = Column(Integer, nullable=False)
    status = Column(String(50), default=DocumentStatus.UPLOADED.value, index=True)
    overall_confidence = Column(Float, default=0.0)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document_type = relationship("DocumentType", back_populates="documents")
    template = relationship("DocumentTemplate", back_populates="documents")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="document", cascade="all, delete-orphan")
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    structured_records = relationship("StructuredRecord", back_populates="document", cascade="all, delete-orphan")


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, default=1)
    image_path = Column(String(512), nullable=False)
    image_width = Column(Integer, default=1240)
    image_height = Column(Integer, default=1754)
    is_blurred = Column(Boolean, default=False)
    blur_score = Column(Float, default=150.0)
    is_dark = Column(Boolean, default=False)
    brightness_score = Column(Float, default=120.0)
    is_overexposed = Column(Boolean, default=False)
    is_cut_off = Column(Boolean, default=False)
    rotation_angle = Column(Integer, default=0)
    resolution_dpi = Column(Integer, default=300)
    is_acceptable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="pages")
    detected_regions = relationship("DetectedRegion", back_populates="page", cascade="all, delete-orphan")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(100), nullable=False)  # preprocessing, region_detection, ocr_inference, validation
    status = Column(String(50), default=ProcessingJobStatus.QUEUED.value)
    progress_percent = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="processing_jobs")


class DetectedRegion(Base):
    __tablename__ = "detected_regions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(String(36), ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False)
    region_type = Column(String(50), default="text_field")  # header, text_field, table_cell, signature
    bounding_box = Column(JSON, nullable=False)
    confidence = Column(Float, default=0.95)
    created_at = Column(DateTime, default=datetime.utcnow)

    page = relationship("DocumentPage", back_populates="detected_regions")
    ocr_predictions = relationship("OCRPrediction", back_populates="region", cascade="all, delete-orphan")


class OCRPrediction(Base):
    __tablename__ = "ocr_predictions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    region_id = Column(String(36), ForeignKey("detected_regions.id", ondelete="CASCADE"), nullable=False)
    model_name = Column(String(100), nullable=False)  # PaddleOCR_v6, TrOCR_Base
    raw_text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    char_confidences = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    region = relationship("DetectedRegion", back_populates="ocr_predictions")
    extracted_fields = relationship("ExtractedField", back_populates="ocr_prediction")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    template_field_id = Column(String(36), ForeignKey("template_fields.id"), nullable=True)
    ocr_prediction_id = Column(String(36), ForeignKey("ocr_predictions.id"), nullable=True)
    field_key = Column(String(100), nullable=False, index=True)
    extracted_value = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    is_valid = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="extracted_fields")
    template_field = relationship("TemplateField", back_populates="extracted_fields")
    ocr_prediction = relationship("OCRPrediction", back_populates="extracted_fields")
    validations = relationship("FieldValidation", back_populates="extracted_field", cascade="all, delete-orphan")
    corrections = relationship("HumanCorrection", back_populates="extracted_field", cascade="all, delete-orphan")


class FieldValidation(Base):
    __tablename__ = "field_validations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    extracted_field_id = Column(String(36), ForeignKey("extracted_fields.id", ondelete="CASCADE"), nullable=False)
    rule_type = Column(String(50), nullable=False)  # regex, range, dictionary, format
    passed = Column(Boolean, nullable=False)
    message = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    extracted_field = relationship("ExtractedField", back_populates="validations")


class HumanCorrection(Base):
    __tablename__ = "human_corrections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    extracted_field_id = Column(String(36), ForeignKey("extracted_fields.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    original_value = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=False)
    correction_reason = Column(String(255), nullable=True)
    corrected_at = Column(DateTime, default=datetime.utcnow)

    extracted_field = relationship("ExtractedField", back_populates="corrections")
    user = relationship("User", back_populates="corrections")


class StructuredRecord(Base):
    __tablename__ = "structured_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    document_type_code = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="structured_records")


class DuplicateMatch(Base):
    __tablename__ = "duplicate_matches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    matched_document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    match_reason = Column(String(255), nullable=False)  # exact_hash, field_value_overlap
    detected_at = Column(DateTime, default=datetime.utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    architecture = Column(String(100), nullable=False)  # PaddleOCR_PPv6, TrOCR_Base
    version = Column(String(50), nullable=False)
    cer = Column(Float, nullable=False)  # Character Error Rate (%)
    wer = Column(Float, nullable=False)  # Word Error Rate (%)
    exact_field_accuracy = Column(Float, nullable=False)  # (%)
    avg_latency_ms = Column(Float, nullable=False)
    onnx_path = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    sample_count = Column(Integer, nullable=False)
    train_split = Column(Float, default=0.8)
    val_split = Column(Float, default=0.1)
    test_split = Column(Float, default=0.1)
    export_format = Column(String(50), default="coco_ocr")
    created_at = Column(DateTime, default=datetime.utcnow)


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    export_type = Column(String(50), nullable=False)  # csv, json, excel, webhook
    filter_criteria = Column(JSON, nullable=True)
    status = Column(String(50), default="completed")
    file_path = Column(String(512), nullable=True)
    record_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # LOGIN, DOCUMENT_UPLOAD, FIELD_CORRECT, TEMPLATE_CREATE
    resource = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
