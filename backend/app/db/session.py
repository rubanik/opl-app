from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


_engine = None


def get_engine():
    global _engine
    if _engine is None:
        from app.core.config import settings
        _engine = create_engine(settings.database_url, pool_pre_ping=True)
    return _engine


SessionLocal = sessionmaker(autoflush=False, autocommit=False, class_=Session)


def get_db() -> Iterator[Session]:
    eng = get_engine()
    SessionLocal.configure(bind=eng)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
