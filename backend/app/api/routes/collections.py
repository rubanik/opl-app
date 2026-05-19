from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.opl import OplCollectionLink, Opl
from app.models.user import User
from app.schemas.opl import (
    OplCollectionCreate, OplCollectionUpdate, OplCollectionOut,
    OplCollectionDetailOut, OplCollectionItemOut, OplCollectionLinkCreate,
    OplCollectionLinkOut,
    OplListOut, OplTagOut, OplTagCreate, AuthorOut,
)
from app.services.auth import get_current_user, get_current_user_optional
from app.services.collections import (
    list_collections, get_collection, create_collection,
    update_collection, delete_collection,
    add_opl_to_collection, remove_opl_from_collection,
    get_collection_tags, create_collection_tag, delete_collection_tag,
    list_opls_in_collection as svc_list_opls_in_collection,
)

router = APIRouter(prefix='/api/collections', tags=['collections'])


@router.get('/')
def list_colls(
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user_optional),
):
    colls = list_collections(db)
    return [OplCollectionOut.model_validate(c) for c in colls]


@router.post('/', response_model=OplCollectionOut, status_code=201)
def create_coll(
    body: OplCollectionCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = create_collection(db, title=body.title, description=body.description)
    db.commit()
    return coll


@router.get('/{collection_id}', response_model=OplCollectionDetailOut)
def get_coll(
    collection_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user_optional),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, 'Коллекция не найдена')

    link_ids = db.execute(
        select(OplCollectionLink.opl_id)
        .where(OplCollectionLink.collection_id == collection_id)
    ).scalars().all()

    if link_ids:
        opls = db.execute(
            select(Opl)
            .where(Opl.id.in_(link_ids))
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


@router.patch('/{collection_id}', response_model=OplCollectionOut)
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
        raise HTTPException(404, 'Коллекция не найдена')
    db.commit()
    return coll


@router.delete('/{collection_id}')
def delete_coll(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ok = delete_collection(db, collection_id)
    if not ok:
        raise HTTPException(404, 'Коллекция не найдена')
    db.commit()
    return {'ok': True}


# --- Collection <-> OPL links ---

@router.post('/{collection_id}/opls', response_model=OplCollectionLinkOut, status_code=201)
def link_opl(
    collection_id: uuid.UUID,
    body: OplCollectionLinkCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, 'Коллекция не найдена')

    from app.models.opl import Opl as OplModel
    opl = db.get(OplModel, body.opl_id)
    if not opl:
        raise HTTPException(404, 'Инструкция не найдена')

    link = add_opl_to_collection(db, collection_id, body.opl_id)
    if link is None:
        raise HTTPException(400, 'Не удалось связать инструкцию с коллекцией')
    db.commit()
    return OplCollectionLinkOut(opl_id=link.opl_id, collection_id=link.collection_id)


@router.delete('/{collection_id}/opls/{opl_id}')
def unlink_opl(
    collection_id: uuid.UUID,
    opl_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ok = remove_opl_from_collection(db, collection_id, opl_id)
    if not ok:
        raise HTTPException(404, 'Связь не найдена')
    db.commit()
    return {'ok': True}


# --- Collection-scoped OPL list (delegated to service) ---

@router.get('/{collection_id}/opls-list')
def list_opls_in_collection(
    collection_id: uuid.UUID,
    title: str | None = Query(None),
    description: str | None = Query(None),
    tag_ids: list[uuid.UUID] | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user_optional),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, 'Коллекция не найдена')

    data = svc_list_opls_in_collection(
        db, collection_id,
        title=title, description=description,
        tag_ids=tag_ids, skip=skip, limit=limit,
    )

    # Check for early-return (empty) results from service
    if 'step_counts' not in data:
        return data

    rows = data['items']
    result = []
    for r in rows:
        result.append(OplListOut(
            id=r.id, title=r.title, description=r.description,
            created_at=r.created_at, updated_at=r.updated_at,
            step_count=data['step_counts'].get(r.id, 0),
            total_duration_sec=data['duration_totals'].get(r.id, 0),
            author=data['author_map'].get(r.id),
            tags=data['tag_map'].get(r.id, []),
            collections=[]
        ))

    return {'items': result, 'total': data['total'], 'skip': skip, 'limit': limit}


# --- Collection-scoped tags ---

@router.get('/{collection_id}/tags', response_model=list[OplTagOut])
def list_tags_in_collection(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User | None = Depends(get_current_user_optional),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, 'Коллекция не найдена')

    return get_collection_tags(db, collection_id)


@router.post('/{collection_id}/tags', response_model=OplTagOut, status_code=201)
def create_tag_in_collection(
    collection_id: uuid.UUID,
    body: OplTagCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, 'Коллекция не найдена')

    tag = create_collection_tag(db, collection_id, name=body.name, color=body.color)
    if tag is None:
        raise HTTPException(400, 'Тег с таким именем уже существует в этой коллекции')
    db.commit()
    return tag


@router.delete('/{collection_id}/tags/{tag_id}')
def delete_tag_in_collection(
    collection_id: uuid.UUID,
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    coll = get_collection(db, collection_id)
    if not coll:
        raise HTTPException(404, 'Коллекция не найдена')

    ok = delete_collection_tag(db, collection_id, tag_id)
    if not ok:
        raise HTTPException(404, 'Тег не найден')
    db.commit()
    return {'ok': True}
