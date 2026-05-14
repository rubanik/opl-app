"""Migration: add title column to steps table."""
from __future__ import annotations

from sqlalchemy import text

from app.db.session import get_engine
from app.models.opl import Step


def upgrade():
    engine = get_engine()
    with engine.connect() as conn:
        table = Step.__tablename__
        result = conn.execute(text(
            f"SELECT column_name FROM information_schema.columns "
            f"WHERE table_name = '{table}' AND table_schema = 'public'"
        )).mappings().all()
        col_names = [c["column_name"] for c in result]
        if "title" not in col_names:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN title VARCHAR(500) NOT NULL DEFAULT ''"))
            conn.commit()
            print("Migration: added steps.title column")
        else:
            print("Migration: steps.title already exists, skipping")
