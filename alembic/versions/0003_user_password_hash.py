"""add secure password storage to users

Revision ID: 0003_user_password_hash
Revises: 0002_processing_job_uniqueness
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_user_password_hash'
down_revision = '0002_processing_job_uniqueness'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('password_hash', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))

def downgrade():
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'password_hash')
