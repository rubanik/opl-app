from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.opl import OplCollection, OplCollectionLink, Opl, Step, Photo, OplTag, OplTagLink


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


def get_collection_tags(db: Session, collection_id: uuid.UUID) -> list[OplTag]:
    stmt = select(OplTag).where(OplTag.collection_id == collection_id).order_by(OplTag.name)
    return db.execute(stmt).scalars().all()


def create_collection_tag(
    db: Session,
    collection_id: uuid.UUID,
    name: str,
    color: str = '#1976d2',
) -> Optional[OplTag]:
    existing = db.execute(
        select(OplTag).where(
            OplTag.name == name,
            OplTag.collection_id == collection_id,
        )
    ).scalar_one_or_none()
    if existing:
        return None
    tag = OplTag(name=name, color=color, collection_id=collection_id)
    db.add(tag)
    db.flush()
    db.refresh(tag)
    return tag


def delete_collection_tag(db: Session, collection_id: uuid.UUID, tag_id: uuid.UUID) -> bool:
    tag = db.get(OplTag, tag_id)
    if not tag or tag.collection_id != collection_id:
        return False
    db.delete(tag)
    db.flush()
    return True


def list_opls_in_collection(
    db: Session,
    collection_id: uuid.UUID,
    title: Optional[str] = None,
    description: Optional[str] = None,
    tag_ids: Optional[list[uuid.UUID]] = None,
    skip: int = 0,
    limit: int = 50,
) -> dict:
    opl_ids_in_coll = [
        row.opl_id for row in db.execute(
            select(OplCollectionLink.opl_id).where(
                OplCollectionLink.collection_id == collection_id
            )
        ).all()
    ]

    if not opl_ids_in_coll:
        return dict(items=[], total=0, skip=skip, limit=limit)

    stmt = select(Opl).where(Opl.id.in_(opl_ids_in_coll))
    conditions = []
    if title:
        conditions.append(Opl.title.ilike(func.concat('%', title, '%')))
    if description:
        conditions.append(Opl.description.ilike(func.concat('%', description, '%')))
    if tag_ids and len(tag_ids) > 0:
        tagged_ids = list(db.execute(
            select(OplTagLink.opl_id).where(
                OplTagLink.tag_id.in_(tag_ids)
            )
        ).scalars().all())
        if tagged_ids:
            conditions.append(Opl.id.in_(tagged_ids))
        else:
            return dict(items=[], total=0, skip=skip, limit=limit)
    if conditions:
        stmt = stmt.where(or_(*conditions))

    subq = stmt.subquery()
    total = db.execute(select(func.count()).select_from(subq)).scalar()

    stmt = stmt.order_by(Opl.created_at.desc()).offset(skip).limit(limit)
    rows = db.execute(stmt).scalars().all()

    opl_ids = [r.id for r in rows]
    step_counts = {}
    duration_totals = {}
    if opl_ids:
        for row in db.execute(
            select(Step.opl_id, func.count(Step.id), func.coalesce(func.sum(Step.duration_sec), 0))
            .where(Step.opl_id.in_(opl_ids)).group_by(Step.opl_id)
        ).all():
            step_counts[row[0]] = row[1]
            duration_totals[row[0]] = row[2]

    tag_map = {}
    if opl_ids:
        for link in db.execute(
            select(OplTagLink).where(OplTagLink.opl_id.in_(opl_ids))
        ).scalars().all():
            tag = db.get(OplTag, link.tag_id)
            if tag:
                tag_map.setdefault(link.opl_id, []).append(tag)

    author_map = {}
    if opl_ids:
        from app.models.user import User as UserModel
        for opl_id in opl_ids:
            opl_row = db.get(Opl, opl_id)
            if opl_row and opl_row.created_by:
                author = db.get(UserModel, opl_row.created_by)
                if author:
                    author_map[opl_id] = dict(
                        username=author.username,
                        surname=author.surname,
                        given_name=author.given_name,
                    )

    return dict(
        items=rows,
        total=total,
        skip=skip,
        limit=limit,
        step_counts=step_counts,
        duration_totals=duration_totals,
        tag_map=tag_map,
        author_map=author_map,
    )
