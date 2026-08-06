-- ==============================================================================
-- TFrenzy Handwritten Document Intelligence Platform - Complete Database DDL
-- Database: PostgreSQL 15+
-- All 18 Core Tables with FK Relationships and Indexes
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'verifier', 'auditor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DOCUMENT_TYPES
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DOCUMENT_TEMPLATES
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    sample_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TEMPLATE_FIELDS
CREATE TABLE template_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'name', 'phone', 'date', 'employee_id', 'email', 'vehicle_number', 'quantity', 'checklist', 'regex')),
    validation_regex TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    min_confidence NUMERIC(3,2) DEFAULT 0.85,
    bbox_x NUMERIC(5,2) NOT NULL, -- percentage 0-100
    bbox_y NUMERIC(5,2) NOT NULL,
    bbox_width NUMERIC(5,2) NOT NULL,
    bbox_height NUMERIC(5,2) NOT NULL,
    CONSTRAINT uq_template_field UNIQUE (template_id, field_key)
);

-- 5. DOCUMENTS
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    template_id UUID REFERENCES document_templates(id),
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'preprocessing', 'ocr_in_progress', 'verification_required', 'verified', 'rejected', 'failed')),
    current_stage VARCHAR(50) NOT NULL DEFAULT 'quality_check',
    overall_confidence NUMERIC(3,2) DEFAULT 0.00,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of_id UUID REFERENCES documents(id),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 6. DOCUMENT_PAGES
CREATE TABLE document_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    image_path TEXT NOT NULL,
    image_width INT NOT NULL,
    image_height INT NOT NULL,
    is_blurred BOOLEAN DEFAULT FALSE,
    blur_score NUMERIC(8,2),
    is_dark BOOLEAN DEFAULT FALSE,
    brightness_score NUMERIC(8,2),
    is_overexposed BOOLEAN DEFAULT FALSE,
    is_cut_off BOOLEAN DEFAULT FALSE,
    rotation_angle NUMERIC(5,2) DEFAULT 0.00,
    resolution_dpi INT DEFAULT 300,
    is_acceptable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROCESSING_JOBS
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress_percentage INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- 8. DETECTED_REGIONS
CREATE TABLE detected_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    bbox_x NUMERIC(5,2) NOT NULL,
    bbox_y NUMERIC(5,2) NOT NULL,
    bbox_width NUMERIC(5,2) NOT NULL,
    bbox_height NUMERIC(5,2) NOT NULL,
    cropped_image_path TEXT
);

-- 9. OCR_PREDICTIONS
CREATE TABLE ocr_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID NOT NULL REFERENCES detected_regions(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    raw_text TEXT NOT NULL,
    cleaned_text TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL,
    processing_time_ms INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. EXTRACTED_FIELDS
CREATE TABLE extracted_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    template_field_id UUID REFERENCES template_fields(id),
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    ocr_value TEXT NOT NULL,
    final_value TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL,
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validation_message TEXT,
    is_corrected BOOLEAN NOT NULL DEFAULT FALSE
);

-- 11. FIELD_VALIDATIONS
CREATE TABLE field_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extracted_field_id UUID NOT NULL REFERENCES extracted_fields(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    raw_value TEXT,
    is_valid BOOLEAN NOT NULL,
    rule_applied VARCHAR(100) NOT NULL,
    error_message TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. HUMAN_CORRECTIONS
CREATE TABLE human_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    original_ocr_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    corrected_by UUID REFERENCES users(id),
    corrected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 13. STRUCTURED_RECORDS
CREATE TABLE structured_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_type_code VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. DUPLICATE_MATCHES
CREATE TABLE duplicate_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    matched_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5,4) NOT NULL, -- e.g. 0.9850
    match_reason VARCHAR(255) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. MODEL_VERSIONS
CREATE TABLE model_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    architecture VARCHAR(100) NOT NULL,
    version VARCHAR(20) UNIQUE NOT NULL,
    cer NUMERIC(5,2) NOT NULL,
    wer NUMERIC(5,2) NOT NULL,
    exact_field_accuracy NUMERIC(5,2) NOT NULL,
    avg_latency_ms INT NOT NULL,
    is_edge_compatible BOOLEAN DEFAULT TRUE,
    onnx_exported BOOLEAN DEFAULT TRUE,
    tensorrt_engine_ready BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. DATASET_VERSIONS
CREATE TABLE dataset_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) UNIQUE NOT NULL,
    sample_count INT NOT NULL DEFAULT 0,
    corrected_samples_count INT NOT NULL DEFAULT 0,
    document_type_id UUID REFERENCES document_types(id),
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. EXPORT_JOBS
CREATE TABLE export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'excel', 'json', 'api_webhook')),
    document_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. AUDIT_LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_doc_type ON documents(document_type_id);
CREATE INDEX idx_extracted_fields_doc_id ON extracted_fields(document_id);
CREATE INDEX idx_ocr_predictions_region_id ON ocr_predictions(region_id);
CREATE INDEX idx_human_corrections_doc_id ON human_corrections(document_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
