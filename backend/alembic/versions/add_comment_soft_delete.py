"""add deleted_at to opl_comments for soft delete

Revision ID: add_comment_soft_delete
Revises: add_opl_comments
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "add_comment_soft_delete"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("opl_comments")]
    if "deleted_at" not in columns:
        op.add_column("opl_comments", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("opl_comments", "deleted_at")
