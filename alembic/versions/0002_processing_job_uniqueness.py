"""enforce one logical processing workflow per document

Revision ID: 0002_processing_job_uniqueness
Revises: 0001_initial_schema
"""
from alembic import op

revision = '0002_processing_job_uniqueness'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint(
        'uq_processing_jobs_document_id', 'processing_jobs', ['document_id']
    )


def downgrade():
    op.drop_constraint('uq_processing_jobs_document_id', 'processing_jobs', type_='unique')
