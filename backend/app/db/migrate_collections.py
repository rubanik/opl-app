"""One-time migration: create "Общие" collection, migrate existing data."""
from __future__ import annotations

from sqlalchemy import text


def upgrade():
    from app.db.session import get_engine
    eng = get_engine()

    # Create default collection
    with eng.connect() as conn:
        result = conn.execute(text(
            "SELECT id FROM opl_collections WHERE name = 'Общие'"
        )).scalar_one_or_none()

        if result is None:
            # Create the collection first
            coll_id = conn.execute(text(
                "INSERT INTO opl_collections (name) VALUES ('Общие') RETURNING id"
            )).scalar()
            conn.commit()

            # Migrate all OPLs to "Общие"
            conn.execute(text(
                "UPDATE opls SET collection_id = :cid WHERE collection_id IS NULL"
            ), {"cid": coll_id})

            # Migrate all tags to "Общие"
            conn.execute(text(
                "UPDATE opl_tags SET collection_id = :cid WHERE collection_id IS NULL"
            ), {"cid": coll_id})

            # Subscribe all users to "Общие"
            conn.execute(text(
                "INSERT INTO user_collection_links (user_id, collection_id) "
                "SELECT id, :cid FROM users ON CONFLICT DO NOTHING"
            ), {"cid": coll_id})

            conn.commit()
