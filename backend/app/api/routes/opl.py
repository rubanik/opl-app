from __future__ import annotations

import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.session import get_db
from app.models.opl import Base, Opl, Step, Photo, OplTag, OplTagLink
from app.models.user import User
from app.schemas.opl import OplCreate, OplOut, OplListOut, StepOut, StepCreate, PhotoOut, OplUpdate, StepUpdate, OplTagOut, OplTagCreate, OplTagLinkCreate, AuthorOut
from app.services.auth import get_current_user
import qrcode

router = APIRouter(prefix="/api/opls", tags=["opl"])


@router.get("/")
def list_opls(
    title: str | None = Query(None),
    description: str | None = Query(None),
    tag_ids: list[uuid.UUID] | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    stmt = select(Opl)
    conditions = []
    if title:
        conditions.append(Opl.title.ilike(func.concat('%', title, '%')))
    if description:
        conditions.append(Opl.description.ilike(func.concat('%', description, '%')))
    if tag_ids and len(tag_ids) > 0:
        tagged_ids = list(db.execute(
            select(OplTagLink.opl_id).where(OplTagLink.tag_id.in_(tag_ids))
        ).scalars().all())
        if tagged_ids:
            conditions.append(Opl.id.in_(tagged_ids))
        else:
            conditions.append(Opl.id == uuid.UUID(int=0))
    if conditions:
        stmt = stmt.where(or_(*conditions))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar()
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
        for opl_id in opl_ids:
            opl_row = db.get(Opl, opl_id)
            if opl_row and opl_row.created_by:
                author = db.get(User, opl_row.created_by)
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


@router.post("/", response_model=OplOut, status_code=201)
def create_opl(body: OplCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    opl = Opl(title=body.title, description=body.description, created_by=_user.id)
    db.add(opl)
    db.flush()

    for si in body.steps:
        step = Step(
            opl_id=opl.id,
            step_number=si.step_number,
            title=si.title,
            description=si.description,
            duration_sec=si.duration_sec,
        )
        db.add(step)

    for tag_id in body.tags:
        tag = db.get(OplTag, tag_id)
        if tag:
            db.add(OplTagLink(opl_id=opl.id, tag_id=tag_id))

    db.commit()
    db.refresh(opl)
    opl = db.execute(
        select(Opl).options(
            joinedload(Opl.steps).joinedload(Step.photos),
            joinedload(Opl.tags),
            joinedload(Opl.author)
        ).where(Opl.id == opl.id)
    ).unique().scalar_one()
    return opl


@router.delete("/{opl_id}")
def delete_opl(opl_id: uuid.UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    opl = db.get(Opl, opl_id)
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")
    db.delete(opl)
    db.commit()
    return {"ok": True}


@router.patch("/{opl_id}", response_model=OplOut)
def update_opl(opl_id: uuid.UUID, body: OplUpdate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    opl = db.get(Opl, opl_id)
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")
    if body.title is not None:
        opl.title = body.title
    if body.description is not None:
        opl.description = body.description
    db.commit()
    db.refresh(opl)
    opl = db.execute(
        select(Opl).options(
            joinedload(Opl.steps).joinedload(Step.photos),
            joinedload(Opl.tags),
            joinedload(Opl.author)
        ).where(Opl.id == opl_id)
    ).unique().scalar_one()
    return opl


@router.patch("/{opl_id}/steps/{step_id}", response_model=StepOut)
def update_step(opl_id: uuid.UUID, step_id: uuid.UUID, body: StepUpdate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    step = db.get(Step, step_id)
    if not step or step.opl_id != opl_id:
        raise HTTPException(404, "Шаг не найден")
    if body.step_number is not None:
        step.step_number = body.step_number
    if body.title is not None:
        step.title = body.title
    if body.description is not None:
        step.description = body.description
    if body.duration_sec is not None:
        step.duration_sec = body.duration_sec
    db.commit()
    db.refresh(step)
    return step


@router.post("/{opl_id}/steps", response_model=StepOut, status_code=201)
def create_step(opl_id: uuid.UUID, body: StepCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
	opl = db.get(Opl, opl_id)
	if not opl:
		raise HTTPException(404, "Инструкция не найдена")
	step = Step(
		opl_id=opl.id,
		step_number=body.step_number,
		title=body.title,
		description=body.description,
		duration_sec=body.duration_sec,
	)
	db.add(step)
	for pi in body.photos:
		db.add(Photo(step_id=step.id, display_order=pi.display_order))
	db.commit()
	db.refresh(step)
	return step


@router.delete("/{opl_id}/steps/{step_id}")
def delete_step(opl_id: uuid.UUID, step_id: uuid.UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    step = db.get(Step, step_id)
    if not step or step.opl_id != opl_id:
        raise HTTPException(404, "Шаг не найден")
    db.delete(step)
    remaining = db.execute(select(Step).where(Step.opl_id == opl_id).order_by(Step.step_number)).scalars().all()
    for i, s in enumerate(remaining):
        s.step_number = i + 1
    db.commit()
    return {"ok": True}


@router.put("/{opl_id}/steps/{step_id}/photos/{photo_id}", response_model=PhotoOut)
def replace_photo(
    opl_id: uuid.UUID,
    step_id: uuid.UUID,
    photo_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    photo = db.get(Photo, photo_id)
    if not photo or photo.step_id != step_id:
        raise HTTPException(404, "Фото не найдено")
    step = db.get(Step, step_id)
    if not step or step.opl_id != opl_id:
        raise HTTPException(404, "Шаг не найден")
    data = file.file.read()
    mime = file.content_type or "image/jpeg"
    photo.data = data
    photo.mime_type = mime
    db.commit()
    db.refresh(photo)
    return photo


@router.get("/tags", response_model=list[OplTagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.execute(select(OplTag).order_by(OplTag.name)).scalars().all()


@router.post("/tags", response_model=OplTagOut, status_code=201)
def create_tag(body: OplTagCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    existing = db.execute(select(OplTag).where(OplTag.name == body.name)).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Тег с таким именем уже существует")
    tag = OplTag(name=body.name, color=body.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: uuid.UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    tag = db.get(OplTag, tag_id)
    if not tag:
        raise HTTPException(404, "Тег не найден")
    db.delete(tag)
    db.commit()
    return {"ok": True}


@router.get("/{opl_id}", response_model=OplOut)
def get_opl(opl_id: uuid.UUID, db: Session = Depends(get_db)):
    opl = db.execute(
        select(Opl).options(
            joinedload(Opl.steps).joinedload(Step.photos),
            joinedload(Opl.tags),
            joinedload(Opl.author)
        ).where(Opl.id == opl_id)
    ).unique().scalar_one_or_none()
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")
    return opl


@router.post("/{opl_id}/steps/{step_id}/photos", response_model=PhotoOut)
def upload_photo(
    opl_id: uuid.UUID,
    step_id: uuid.UUID,
    order: int = Query(..., alias="order"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    opl = db.get(Opl, opl_id)
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")
    step = db.get(Step, step_id)
    if not step or step.opl_id != opl_id:
        raise HTTPException(404, "Шаг не найден")

    data = file.file.read()
    mime = file.content_type or "image/jpeg"

    photo = Photo(
        step_id=step_id,
        display_order=order,
        data=data,
        mime_type=mime,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/steps/{step_id}/photos/{photo_id}")
def delete_photo(step_id: uuid.UUID, photo_id: uuid.UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    photo = db.get(Photo, photo_id)
    if not photo or photo.step_id != step_id:
        raise HTTPException(404, "Фото не найдено")
    db.delete(photo)
    db.commit()
    return {"ok": True}


@router.get("/{opl_id}/photos/{photo_id}")
def get_photo(opl_id: uuid.UUID, photo_id: uuid.UUID, db: Session = Depends(get_db)):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "Фото не найдено")
    step = db.get(Step, photo.step_id)
    if not step or step.opl_id != opl_id:
        raise HTTPException(403, "Нет доступа")
    return Response(content=photo.data, media_type=photo.mime_type)


@router.get("/{opl_id}/qr")
def get_qr(opl_id: uuid.UUID, base_url: str | None = Query(None),
           db: Session = Depends(get_db)):
    opl = db.get(Opl, opl_id)
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")
    url = f"{base_url or settings.frontend_url}/opl/{opl_id}"
    qr = qrcode.make(url)
    buf = BytesIO()
    qr.save(buf, "PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")


@router.post("/{opl_id}/tags")
def link_tags(opl_id: uuid.UUID, body: OplTagLinkCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    opl = db.get(Opl, opl_id)
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")
    for link in opl.tag_links:
        db.delete(link)
    for tag_id in body.tag_ids:
        tag = db.get(OplTag, tag_id)
        if tag:
            db.add(OplTagLink(opl_id=opl_id, tag_id=tag_id))
    db.commit()
    tags = db.execute(
        select(OplTag).join(OplTagLink).where(OplTagLink.opl_id == opl_id)
    ).scalars().all()
    return {"ok": True, "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in tags]}


@router.get("/{opl_id}/pdf")
def download_pdf(opl_id: uuid.UUID, db: Session = Depends(get_db)):
    opl = db.execute(
        select(Opl).options(
            joinedload(Opl.steps),
            joinedload(Opl.tags)
        ).where(Opl.id == opl_id)
    ).unique().scalar_one_or_none()
    if not opl:
        raise HTTPException(404, "Инструкция не найдена")
    from app.services.markdown import render_markdown as render_md
    steps_data = []
    for s in opl.steps:
        steps_data.append({
            'step_number': s.step_number,
            'title': s.title,
            'description': s.description,
            'description_html': render_md(s.description),
            'duration_sec': s.duration_sec,
        })
    tags_data = [{"name": t.name, "color": t.color} for t in opl.tags]
    opl_data = {
        'title': opl.title,
        'description': opl.description,
        'created_at': opl.created_at,
    }
    from app.services.pdf_export import build_pdf
    buf = build_pdf(opl_data, steps_data, tags_data)
    return Response(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="opl_{opl_id}.pdf"'},
    )
