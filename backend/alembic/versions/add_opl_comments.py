"""add opl_comments table

Revision ID: add_opl_comments
Revises: 001_initial
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "add_opl_comments"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    if "opl_comments" not in inspector.get_table_names():
        op.create_table(
            "opl_comments",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("opl_id", sa.String(36), sa.ForeignKey("opls.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("text", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_opl_comments_opl_id", "opl_comments", ["opl_id"])
        op.create_index("ix_opl_comments_user_id", "opl_comments", ["user_id"])


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_opl_comments_user_id")
    op.execute("DROP INDEX IF EXISTS ix_opl_comments_opl_id")
    op.execute("DROP TABLE IF EXISTS opl_comments")
