from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.opl import OplCollection, OplCollectionLink, Opl, Step, Photo, OplTag, OplTagLink
from app.models.user import User
from app.schemas.opl import (
    OplCollectionCreate, OplCollectionUpdate, OplCollectionOut,
    OplCollectionDetailOut, OplCollectionItemOut, OplCollectionLinkCreate,
    OplCollectionLinkOut,
    OplListOut, OplOut, OplTagOut, OplTagCreateInput, AuthorOut,
)
from app.services.auth import get_current_user
from app.services.collections import (
    list_collections, get_collection, create_collection,
    update_collection, delete_collection,
    add_opl_to_collection, remove_opl_from_collection,
)

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("/")
def list_colls(
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user),
):
    colls = list_collections(db)
    return [OplCollectionOut.model_validate(c) for c in colls]


@router.post("/", response_model=OplCollectionOut, status_code=201)
def create_coll(
    body: OplCollectionCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = create_collection(db, title=body.title, description=body.description)
    db.commit()
    return coll


@router.get("/{collection_id}", response_model=OplCollectionDetailOut)
def get_coll(
    collection_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    # Get linked OPLs
    link_stmt = (
        select(OplCollectionLink)
        .where(OplCollectionLink.collection_id == collection_id)
        .order_by(Opl.created_at.desc())
    )
    # We need to join Opl for ordering
    links = db.execute(
        select(OplCollectionLink.opl_id)
        .where(OplCollectionLink.collection_id == collection_id)
    ).scalars().all()

    if links:
        opls = db.execute(
            select(Opl)
            .where(Opl.id.in_(links))
            .order_by(Opl.created_at.desc())
            .offset(skip)
            .limit(limit)
        ).scalars().all()
    else:
        opls = []

    items = [OplCollectionItemOut(id=o.id, title=o.title) for o in opls]

    return OplCollectionDetailOut(
        id=coll.id,
        title=coll.title,
        description=coll.description,
        created_at=coll.created_at,
        updated_at=coll.updated_at,
        items=items,
    )


@router.patch("/{collection_id}", response_model=OplCollectionOut)
def update_coll(
    collection_id: uuid.UUID,
    body: OplCollectionUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = update_collection(
        db,
        collection_id=collection_id,
        title=body.title,
        description=body.description,
    )
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")
    db.commit()
    return coll


@router.delete("/{collection_id}")
def delete_coll(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ok = delete_collection(db, collection_id)
    if not ok:
        raise HTTPException(404, "Коллекция не найдена")
    db.commit()
    return {"ok": True}


# --- Collection <-> OPL links ---

@router.post("/{collection_id}/opls", response_model=OplCollectionLinkOut, status_code=201)
def link_opl(
    collection_id: uuid.UUID,
    body: OplCollectionLinkCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    opl = db.get(Opl, body.opl_id)
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")

    link = add_opl_to_collection(db, collection_id, body.opl_id)
    if link is None:
        raise HTTPException(400, "Не удалось связать инструкцию с коллекцией")
    db.commit()
    return OplCollectionLinkOut(opl_id=link.opl_id, collection_id=link.collection_id)


@router.delete("/{collection_id}/opls/{opl_id}")
def unlink_opl(
    collection_id: uuid.UUID,
    opl_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ok = remove_opl_from_collection(db, collection_id, opl_id)
    if not ok:
        raise HTTPException(404, "Связь не найдена")
    db.commit()
    return {"ok": True}


# --- Collection-scoped OPL list ---

@router.get("/{collection_id}/opls-list")
def list_opls_in_collection(
    collection_id: uuid.UUID,
    title: str | None = Query(None),
    description: str | None = Query(None),
    tag_ids: list[uuid.UUID] | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    # Get OPLs in this collection
    opl_ids_in_coll = [
        row.opl_id for row in db.execute(
            select(OplCollectionLink.opl_id).where(
                OplCollectionLink.collection_id == collection_id
            )
        ).all()
    ]

    if not opl_ids_in_coll:
        return {"items": [], "total": 0, "skip": skip, "limit": limit}

    stmt = select(Opl).where(Opl.id.in_(opl_ids_in_coll))
    conditions = []
    if title:
        conditions.append(Opl.title.ilike(func.concat('%', title, '%')))
    if description:
        conditions.append(Opl.description.ilike(func.concat('%', description, '%')))
    if tag_ids and len(tag_ids) > 0:
        # Tags must also belong to this collection (via collection_id)
        tagged_ids = list(db.execute(
            select(OplTagLink.opl_id).where(
                OplTagLink.tag_id.in_(tag_ids)
            )
        ).scalars().all())
        if tagged_ids:
            conditions.append(Opl.id.in_(tagged_ids))
        else:
            conditions.append(Opl.id == uuid.UUID(int=0))
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

    # Tags scoped to this collection
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
                    author_map[opl_id] = AuthorOut(
                        username=author.username,
                        surname=author.surname,
                        given_name=author.given_name
                    )

    result = []
    for r in rows:
        result.append(OplListOut(
            id=r.id, title=r.title, description=r.description,
            created_at=r.created_at, updated_at=r.updated_at,
            step_count=step_counts.get(r.id, 0),
            total_duration_sec=duration_totals.get(r.id, 0),
            author=author_map.get(r.id),
            tags=tag_map.get(r.id, [])
        ))

    return {"items": result, "total": total, "skip": skip, "limit": limit}


# --- Collection-scoped tags ---

@router.get("/{collection_id}/tags", response_model=list[OplTagOut])
def list_tags_in_collection(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    stmt = select(OplTag).where(OplTag.collection_id == collection_id).order_by(OplTag.name)
    return db.execute(stmt).scalars().all()


@router.post("/{collection_id}/tags", response_model=OplTagOut, status_code=201)
def create_tag_in_collection(
    collection_id: uuid.UUID,
    body: OplTagCreateInput,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    from app.schemas.opl import OplTagCreate
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    # Check uniqueness within this collection
    existing = db.execute(
        select(OplTag).where(
            OplTag.name == body.name,
            OplTag.collection_id == collection_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Тег с таким именем уже существует в этой коллекции")

    tag = OplTag(name=body.name, color=body.color, collection_id=collection_id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{collection_id}/tags/{tag_id}")
def delete_tag_in_collection(
    collection_id: uuid.UUID,
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, "Коллекция не найдена")

    tag = db.get(OplTag, tag_id)
    if not tag or tag.collection_id != collection_id:
        raise HTTPException(404, "Тег не найден")
    db.delete(tag)
    db.commit()
    return {"ok": True}
