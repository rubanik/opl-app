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

    op.create_index("idx_opls_title", "opls", ["title"])
    op.create_index("idx_opls_description", "opls", ["description"])
    op.create_index("idx_opls_created_at", "opls", ["created_at"])
    op.create_index("idx_steps_opl_id", "steps", ["opl_id"])
    op.create_index("idx_steps_step_number", "steps", ["opl_id", "step_number"])
    op.create_index("idx_photos_step_id", "photos", ["step_id"])
    op.create_index("idx_tag_links_opl", "opl_tag_links", ["opl_id"])
    op.create_index("idx_tag_links_tag", "opl_tag_links", ["tag_id"])


def downgrade():
    op.drop_index("idx_tag_links_tag", "opl_tag_links")
    op.drop_index("idx_tag_links_opl", "opl_tag_links")
    op.drop_index("idx_photos_step_id", "photos")
    op.drop_index("idx_steps_step_number", "steps")
    op.drop_index("idx_steps_opl_id", "steps")
    op.drop_index("idx_opls_created_at", "opls")
    op.drop_index("idx_opls_description", "opls")
    op.drop_index("idx_opls_title", "opls")

    Base.metadata.drop_all(op.get_bind())
