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
    # --- Collections migration ---
    try:
        with eng.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS opl_collections (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(150) NOT NULL,
                    description TEXT,
                    created_by UUID REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT now()
                )
            """))
            conn.commit()
    except Exception:
        pass
    try:
        with eng.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_collection_links (
                    user_id UUID NOT NULL REFERENCES users(id),
                    collection_id UUID NOT NULL REFERENCES opl_collections(id) ON DELETE CASCADE,
                    PRIMARY KEY (user_id, collection_id)
                )
            """))
            conn.commit()
    except Exception:
        pass
    try:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE opls ADD COLUMN collection_id UUID REFERENCES opl_collections(id) ON DELETE SET NULL"))
            conn.commit()
    except Exception:
        pass
    try:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE opl_tags ADD COLUMN collection_id UUID REFERENCES opl_collections(id) ON DELETE CASCADE"))
            conn.commit()
    except Exception:
        pass
    try:
        from app.db.migrate_collections import upgrade as migrate_collections
        migrate_collections()
    except Exception:
        pass


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
