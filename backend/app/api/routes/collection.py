from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.opl import Base, OplCollection, UserCollectionLink, OplTag, OplTagLink, Opl
from app.models.user import User
from app.schemas.opl import (
    OplCollectionOut,
    OplCollectionCreate,
    OplCollectionUpdate,
    OplCollectionListOut,
    OplTagOut,
    OplTagCreate,
    AuthorOut,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/collections", tags=["collections"])


def _get_default_collection(db: Session) -> OplCollection:
    """Get or create the 'Общие' collection."""
    coll = db.execute(
        select(OplCollection).where(OplCollection.name == "Общие")
    ).scalar_one_or_none()
    if coll:
        return coll
    coll = OplCollection(name="Общие")
    db.add(coll)
    db.flush()
    return coll


@router.get("/")
def list_collections(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    if user:
        links = db.execute(
            select(UserCollectionLink.collection_id).where(UserCollectionLink.user_id == user.id)
        ).scalars().all()
        stmt = select(OplCollection).where(OplCollection.id.in_(links))
    else:
        default = _get_default_collection(db)
        stmt = select(OplCollection).where(OplCollection.id == default.id)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar()
    collections = db.execute(stmt.order_by(OplCollection.name)).scalars().all()
    collection_ids = [c.id for c in collections]

    opl_counts = {}
    if collection_ids:
        for row in db.execute(
            select(Opl.collection_id, func.count(Opl.id))
            .where(Opl.collection_id.in_(collection_ids))
            .group_by(Opl.collection_id)
        ).all():
            opl_counts[row[0]] = row[1]

    result = []
    for c in collections:
        result.append(OplCollectionListOut(
            id=c.id,
            name=c.name,
            description=c.description,
            opl_count=opl_counts.get(c.id, 0),
        ))
    return {"items": result, "total": total}


@router.get("/{collection_id}", response_model=OplCollectionOut)
def get_collection(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    coll = db.get(OplCollection, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    if user:
        subscribed = db.execute(
            select(UserCollectionLink).where(
                UserCollectionLink.user_id == user.id,
                UserCollectionLink.collection_id == collection_id,
            )
        ).scalar_one_or_none()
        if not subscribed:
            default = _get_default_collection(db)
            if coll.id != default.id:
                raise HTTPException(403, "Вы не подписаны на эту коллекцию")

    return coll


@router.post("/", response_model=OplCollectionOut, status_code=201)
def create_collection(
    body: OplCollectionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    coll = OplCollection(
        name=body.name,
        description=body.description,
        created_by=user.id,
    )
    db.add(coll)
    db.flush()

    link = UserCollectionLink(user_id=user.id, collection_id=coll.id)
    db.add(link)
    db.commit()
    db.refresh(coll)
    return coll


@router.patch("/{collection_id}", response_model=OplCollectionOut)
def update_collection(
    collection_id: uuid.UUID,
    body: OplCollectionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    coll = db.get(OplCollection, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")
    if coll.created_by != user.id:
        raise HTTPException(403, "Только создатель может редактировать")

    if body.name is not None:
        coll.name = body.name
    if body.description is not None:
        coll.description = body.description

    db.commit()
    db.refresh(coll)
    return coll


@router.delete("/{collection_id}")
def delete_collection(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    coll = db.get(OplCollection, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")
    if coll.created_by != user.id:
        raise HTTPException(403, "Только создатель может удалить")

    default = _get_default_collection(db)
    if coll.id == default.id:
        raise HTTPException(400, "Нельзя удалить коллекцию «Общие»")

    # Move OPLs to default collection
    db.execute(
        Opl.__table__.update()
        .where(Opl.collection_id == collection_id)
        .values(collection_id=default.id)
    )

    # Delete tags (CASCADE will handle)
    tags = db.execute(
        select(OplTag).where(OplTag.collection_id == collection_id)
    ).scalars().all()
    for tag in tags:
        db.delete(tag)

    db.delete(coll)
    db.commit()
    return {"ok": True}


@router.post("/{collection_id}/subscribe")
def subscribe_collection(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    coll = db.get(OplCollection, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    existing = db.execute(
        select(UserCollectionLink).where(
            UserCollectionLink.user_id == user.id,
            UserCollectionLink.collection_id == collection_id,
        )
    ).scalar_one_or_none()
    if existing:
        return {"ok": True, "subscribed": False}

    link = UserCollectionLink(user_id=user.id, collection_id=collection_id)
    db.add(link)
    db.commit()
    return {"ok": True, "subscribed": True}


@router.delete("/{collection_id}/unsubscribe")
def unsubscribe_collection(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    coll = db.get(OplCollection, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    default = _get_default_collection(db)
    if coll.id == default.id:
        raise HTTPException(400, "Нельзя отписаться от «Общие»")

    link = db.execute(
        select(UserCollectionLink).where(
            UserCollectionLink.user_id == user.id,
            UserCollectionLink.collection_id == collection_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise HTTPException(400, "Вы не подписаны на эту коллекцию")

    db.delete(link)
    db.commit()
    return {"ok": True}


@router.get("/{collection_id}/tags", response_model=list[OplTagOut])
def list_collection_tags(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    coll = db.get(OplCollection, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    tags = (
        db.execute(
            select(OplTag)
            .where(OplTag.collection_id == collection_id)
            .order_by(OplTag.name)
        )
        .scalars()
        .all()
    )
    return tags


@router.post("/{collection_id}/tags", response_model=OplTagOut, status_code=201)
def create_collection_tag(
    collection_id: uuid.UUID,
    body: OplTagCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    coll = db.get(OplCollection, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    existing = db.execute(
        select(OplTag).where(
            OplTag.name == body.name,
            OplTag.collection_id == collection_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Тег с таким именем уже существует")

    tag = OplTag(
        name=body.name,
        color=body.color,
        collection_id=collection_id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{collection_id}/tags/{tag_id}")
def delete_collection_tag(
    collection_id: uuid.UUID,
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = db.get(OplTag, tag_id)
    if not tag or tag.collection_id != collection_id:
        raise HTTPException(404, "Тег не найден")
    db.delete(tag)
    db.commit()
    return {"ok": True}
