from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.opl import OplCollection, OplCollectionLink


def list_collections(db: Session) -> list[OplCollection]:
    return db.execute(
        select(OplCollection).order_by(OplCollection.created_at.desc())
    ).scalars().all()


def get_collection(db: Session, collection_id: uuid.UUID) -> Optional[OplCollection]:
    return db.get(OplCollection, collection_id)


def create_collection(db: Session, title: str, description: Optional[str] = None) -> OplCollection:
    coll = OplCollection(title=title, description=description)
    db.add(coll)
    db.flush()
    db.refresh(coll)
    return coll


def update_collection(
    db: Session,
    collection_id: uuid.UUID,
    title: Optional[str] = None,
    description: Optional[str] = None,
) -> Optional[OplCollection]:
    coll = db.get(OplCollection, collection_id)
    if not coll:
        return None
    if title is not None:
        coll.title = title
    if description is not None:
        coll.description = description
    db.flush()
    db.refresh(coll)
    return coll


def delete_collection(db: Session, collection_id: uuid.UUID) -> bool:
    coll = db.get(OplCollection, collection_id)
    if not coll:
        return False
    db.delete(coll)
    db.flush()
    return True


def add_opl_to_collection(db: Session, collection_id: uuid.UUID, opl_id: uuid.UUID) -> Optional[OplCollectionLink]:
    """Link an OPL to a collection. Returns None if already linked."""
    link = db.execute(
        select(OplCollectionLink).where(
            OplCollectionLink.collection_id == collection_id,
            OplCollectionLink.opl_id == opl_id,
        )
    ).scalar_one_or_none()
    if link:
        return None
    link = OplCollectionLink(collection_id=collection_id, opl_id=opl_id)
    db.add(link)
    db.flush()
    return link


def remove_opl_from_collection(db: Session, collection_id: uuid.UUID, opl_id: uuid.UUID) -> bool:
    link = db.execute(
        select(OplCollectionLink).where(
            OplCollectionLink.collection_id == collection_id,
            OplCollectionLink.opl_id == opl_id,
        )
    ).scalar_one_or_none()
    if not link:
        return False
    db.delete(link)
    db.flush()
    return True
