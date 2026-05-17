from __future__ import annotations

import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.db.session import get_engine
from app.models.opl import Base
from app.models.user import User


def wait_for_db():
    eng = get_engine()
    while True:
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception:
            time.sleep(2)


def _safe_ddl(eng, ddl: str):
    """Execute a DDL statement, swallowing errors if the object already exists."""
    try:
        with eng.connect() as conn:
            conn.execute(text(ddl))
            conn.commit()
    except Exception:
        pass


def init_db():
    wait_for_db()
    eng = get_engine()
    Base.metadata.create_all(eng)
    try:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE opls ADD COLUMN updated_at TIMESTAMP"))
            conn.commit()
    except Exception:
        pass
    try:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE opls ADD COLUMN created_by UUID REFERENCES users(id)"))
            conn.commit()
    except Exception:
        pass
    for col, typ in [
        ("surname", "VARCHAR(100)"),
        ("given_name", "VARCHAR(100)"),
        ("title", "VARCHAR(200)"),
        ("department", "VARCHAR(200)"),
        ("employee_id", "VARCHAR(50)"),
    ]:
        try:
            with eng.connect() as conn:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typ}"))
                conn.commit()
        except Exception:
            pass
    try:
        from app.db.migrate_title import upgrade as migrate_title
        migrate_title()
    except Exception:
        pass
    try:
        from app.db.migrate_indexes import upgrade as migrate_indexes
        migrate_indexes()
    except Exception:
        pass
    try:
        from app.db.migrate_photos_s3 import upgrade as migrate_photos_s3
        migrate_photos_s3()
    except Exception:
        pass
    # --- Collections tables (explicit DDL for safe migration) ---
    # Create opl_collections table if it doesn't exist
    _safe_ddl(eng, """
        CREATE TABLE IF NOT EXISTS opl_collections (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )
    """)
    # Fix: legacy 'name' column must be renamed BEFORE adding 'title' column
    _safe_ddl(eng, "ALTER TABLE opl_collections RENAME COLUMN name TO title")
    # Ensure columns exist on already-created tables (pre-migration compat)
    for col, typ in [
        ("title", "VARCHAR(255)"),
        ("description", "TEXT"),
        ("created_at", "TIMESTAMP"),
        ("updated_at", "TIMESTAMP"),
    ]:
        _safe_ddl(eng, f"ALTER TABLE opl_collections ADD COLUMN {col} {typ}")
    # Backfill NULL title values (after rename or add)
    _safe_ddl(eng, "UPDATE opl_collections SET title = 'Untitled' WHERE title IS NULL")
    # Drop legacy 'name' column if it still exists (rename already handled above)
    _safe_ddl(eng, "ALTER TABLE opl_collections DROP COLUMN IF EXISTS name")
    # Create opl_collection_links table if it doesn't exist
    _safe_ddl(eng, """
        CREATE TABLE IF NOT EXISTS opl_collection_links (
            opl_id UUID REFERENCES opls(id) ON DELETE CASCADE,
            collection_id UUID REFERENCES opl_collections(id) ON DELETE CASCADE,
            PRIMARY KEY (opl_id, collection_id)
        )
    """)
    # Add collection_id to opl_tags if the column doesn't exist
    _safe_ddl(eng, """
        ALTER TABLE opl_tags ADD COLUMN collection_id UUID REFERENCES opl_collections(id) ON DELETE SET NULL
    """)


def create_app(init: bool = True) -> FastAPI:
    if init:
        init_db()
    app = FastAPI(title="OPL API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
