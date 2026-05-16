from __future__ import annotations

import uuid
import logging

from sqlalchemy import text
from app.db.session import get_engine
from app.services.storage import upload_photo

logger = logging.getLogger(__name__)


def upgrade() -> None:
    eng = get_engine()

    # 1. Add s3_key column if not exists
    try:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE photos ADD COLUMN s3_key VARCHAR(500)"))
            conn.commit()
            logger.info("[migrate_photos_s3] Added s3_key column")
    except Exception:
        pass

    # 2. Migrate existing photo.data -> S3
    try:
        with eng.connect() as conn:
            rows = conn.execute(
                text("SELECT id, data, mime_type FROM photos WHERE data IS NOT NULL AND s3_key IS NULL")
            ).fetchall()
            if not rows:
                return
            logger.info(f"[migrate_photos_s3] Migrating {len(rows)} photos to S3")
            for row in rows:
                photo_id, data, mime_type = row[0], row[1], row[2]
                key = f"{uuid.uuid4()}.jpg"
                try:
                    upload_photo(key, data, mime_type or "image/jpeg")
                    conn.execute(
                        text("UPDATE photos SET s3_key = :key, data = NULL WHERE id = :pid"),
                        {"key": key, "pid": photo_id},
                    )
                except Exception as e:
                    logger.error(f"[migrate_photos_s3] Failed to migrate photo {photo_id}: {e}")
            conn.commit()
            logger.info("[migrate_photos_s3] Migration complete")
    except Exception as e:
        logger.warning(f"[migrate_photos_s3] Migration skipped: {e}")
