"""0001_initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-04 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='verifier'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 2. document_types
    op.create_table(
        'document_types',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('code', sa.String(50), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 3. document_templates
    op.create_table(
        'document_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_type_id', sa.String(36), sa.ForeignKey('document_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('version', sa.Integer(), server_default='1'),
        sa.Column('sample_image_path', sa.String(512), nullable=True),
        sa.Column('width', sa.Integer(), server_default='1240'),
        sa.Column('height', sa.Integer(), server_default='1754'),
        sa.Column('active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 4. template_fields
    op.create_table(
        'template_fields',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('template_id', sa.String(36), sa.ForeignKey('document_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('field_key', sa.String(100), nullable=False),
        sa.Column('label', sa.String(255), nullable=False),
        sa.Column('data_type', sa.String(50), server_default='text'),
        sa.Column('bounding_box', sa.JSON(), nullable=False),
        sa.Column('is_required', sa.Boolean(), server_default='true'),
        sa.Column('validation_regex', sa.String(255), nullable=True),
        sa.Column('confidence_threshold', sa.Float(), server_default='0.75'),
        sa.Column('order_index', sa.Integer(), server_default='0')
    )

    # 5. documents
    op.create_table(
        'documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_type_id', sa.String(36), sa.ForeignKey('document_types.id'), nullable=True),
        sa.Column('template_id', sa.String(36), sa.ForeignKey('document_templates.id'), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('mime_type', sa.String(100), server_default='image/png'),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(50), server_default='uploaded'),
        sa.Column('overall_confidence', sa.Float(), server_default='0.0'),
        sa.Column('is_duplicate', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 6. document_pages
    op.create_table(
        'document_pages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('page_number', sa.Integer(), server_default='1'),
        sa.Column('image_path', sa.String(512), nullable=False),
        sa.Column('image_width', sa.Integer(), server_default='1240'),
        sa.Column('image_height', sa.Integer(), server_default='1754'),
        sa.Column('is_blurred', sa.Boolean(), server_default='false'),
        sa.Column('blur_score', sa.Float(), server_default='150.0'),
        sa.Column('is_dark', sa.Boolean(), server_default='false'),
        sa.Column('brightness_score', sa.Float(), server_default='120.0'),
        sa.Column('is_overexposed', sa.Boolean(), server_default='false'),
        sa.Column('is_cut_off', sa.Boolean(), server_default='false'),
        sa.Column('rotation_angle', sa.Integer(), server_default='0'),
        sa.Column('resolution_dpi', sa.Integer(), server_default='300'),
        sa.Column('is_acceptable', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 7. processing_jobs
    op.create_table(
        'processing_jobs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), server_default='queued'),
        sa.Column('progress_percent', sa.Integer(), server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 8. detected_regions
    op.create_table(
        'detected_regions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('page_id', sa.String(36), sa.ForeignKey('document_pages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('region_type', sa.String(50), server_default='text_field'),
        sa.Column('bounding_box', sa.JSON(), nullable=False),
        sa.Column('confidence', sa.Float(), server_default='0.95'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 9. ocr_predictions
    op.create_table(
        'ocr_predictions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('region_id', sa.String(36), sa.ForeignKey('detected_regions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('raw_text', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('char_confidences', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 10. extracted_fields
    op.create_table(
        'extracted_fields',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_field_id', sa.String(36), sa.ForeignKey('template_fields.id'), nullable=True),
        sa.Column('ocr_prediction_id', sa.String(36), sa.ForeignKey('ocr_predictions.id'), nullable=True),
        sa.Column('field_key', sa.String(100), nullable=False),
        sa.Column('extracted_value', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), server_default='0.0'),
        sa.Column('is_valid', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 11. field_validations
    op.create_table(
        'field_validations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('extracted_field_id', sa.String(36), sa.ForeignKey('extracted_fields.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_type', sa.String(50), nullable=False),
        sa.Column('passed', sa.Boolean(), nullable=False),
        sa.Column('message', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 12. human_corrections
    op.create_table(
        'human_corrections',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('extracted_field_id', sa.String(36), sa.ForeignKey('extracted_fields.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('original_value', sa.Text(), nullable=True),
        sa.Column('corrected_value', sa.Text(), nullable=False),
        sa.Column('correction_reason', sa.String(255), nullable=True),
        sa.Column('corrected_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 13. structured_records
    op.create_table(
        'structured_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_type_code', sa.String(50), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 14. duplicate_matches
    op.create_table(
        'duplicate_matches',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('matched_document_id', sa.String(36), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('similarity_score', sa.Float(), nullable=False),
        sa.Column('match_reason', sa.String(255), nullable=False),
        sa.Column('detected_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 15. model_versions
    op.create_table(
        'model_versions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('architecture', sa.String(100), nullable=False),
        sa.Column('version', sa.String(50), nullable=False),
        sa.Column('cer', sa.Float(), nullable=False),
        sa.Column('wer', sa.Float(), nullable=False),
        sa.Column('exact_field_accuracy', sa.Float(), nullable=False),
        sa.Column('avg_latency_ms', sa.Float(), nullable=False),
        sa.Column('onnx_path', sa.String(512), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 16. dataset_versions
    op.create_table(
        'dataset_versions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('version', sa.String(50), nullable=False),
        sa.Column('sample_count', sa.Integer(), nullable=False),
        sa.Column('train_split', sa.Float(), server_default='0.8'),
        sa.Column('val_split', sa.Float(), server_default='0.1'),
        sa.Column('test_split', sa.Float(), server_default='0.1'),
        sa.Column('export_format', sa.String(50), server_default='coco_ocr'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 17. export_jobs
    op.create_table(
        'export_jobs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('export_type', sa.String(50), nullable=False),
        sa.Column('filter_criteria', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(50), server_default='completed'),
        sa.Column('file_path', sa.String(512), nullable=True),
        sa.Column('record_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 18. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource', sa.String(100), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now())
    )

def downgrade():
    tables = [
        'audit_logs', 'export_jobs', 'dataset_versions', 'model_versions',
        'duplicate_matches', 'structured_records', 'human_corrections',
        'field_validations', 'extracted_fields', 'ocr_predictions',
        'detected_regions', 'processing_jobs', 'document_pages', 'documents',
        'template_fields', 'document_templates', 'document_types', 'users'
    ]
    for table in tables:
        op.drop_table(table)
