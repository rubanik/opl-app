from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.db.session import get_engine


def wait_for_db():
    eng = get_engine()
    while True:
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception:
            import time
            time.sleep(2)


def init_db():
    wait_for_db()
    try:
        import alembic.command
        import alembic.config
    except ImportError:
        return
    os.environ["DATABASE_URL"] = settings.database_url
    alembic_cfg = alembic.config.Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
    alembic.command.upgrade(alembic_cfg, "head")


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
