"""add opl_comments table

Revision ID: add_opl_comments
Revises: (none)
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa


revision = "add_opl_comments"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
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
    op.drop_index("ix_opl_comments_user_id", "opl_comments")
    op.drop_index("ix_opl_comments_opl_id", "opl_comments")
    op.drop_table("opl_comments")
