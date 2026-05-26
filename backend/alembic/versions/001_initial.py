"""Initial schema: create all base tables and indexes

Revision ID: 001_initial
Revises: (none)
Create Date: 2026-05-26
"""

from alembic import op
import sqlalchemy as sa

from app.models.opl import Base

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    Base.metadata.create_all(op.get_bind())

    for idx in [
        ("idx_opls_title", "opls", "title"),
        ("idx_opls_description", "opls", "description"),
        ("idx_opls_created_at", "opls", "created_at"),
        ("idx_steps_opl_id", "steps", "opl_id"),
        ("idx_steps_step_number", "steps", "opl_id, step_number"),
        ("idx_photos_step_id", "photos", "step_id"),
        ("idx_tag_links_opl", "opl_tag_links", "opl_id"),
        ("idx_tag_links_tag", "opl_tag_links", "tag_id"),
    ]:
        op.execute(f"CREATE INDEX IF NOT EXISTS {idx[0]} ON {idx[1]} ({idx[2]})")


def downgrade():
    op.execute("DROP INDEX IF EXISTS idx_tag_links_tag")
    op.execute("DROP INDEX IF EXISTS idx_tag_links_opl")
    op.execute("DROP INDEX IF EXISTS idx_photos_step_id")
    op.execute("DROP INDEX IF EXISTS idx_steps_step_number")
    op.execute("DROP INDEX IF EXISTS idx_steps_opl_id")
    op.execute("DROP INDEX IF EXISTS idx_opls_created_at")
    op.execute("DROP INDEX IF EXISTS idx_opls_description")
    op.execute("DROP INDEX IF EXISTS idx_opls_title")

    Base.metadata.drop_all(op.get_bind())
