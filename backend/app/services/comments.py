from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.models.opl import Comment


def get_opl_comment_count(db: Session, opl_id: uuid.UUID) -> int:
    return db.execute(
        select(func.count()).where(
            Comment.opl_id == opl_id,
            Comment.deleted_at.is_(None),
        )
    ).scalar() or 0


def list_opl_comments(db: Session, opl_id: uuid.UUID) -> list[Comment]:
    stmt = (
        select(Comment)
        .where(Comment.opl_id == opl_id)
        .options(joinedload(Comment.author))
        .order_by(Comment.created_at.desc())
    )
    return db.execute(stmt).scalars().unique().all()


def mask_deleted_comments(comments: list[Comment]) -> list[Comment]:
    for c in comments:
        if c.deleted_at is not None:
            c.text = ""
    return comments


def create_comment(db: Session, opl_id: uuid.UUID, user_id: uuid.UUID, text: str) -> Comment:
    comment = Comment(opl_id=opl_id, user_id=user_id, text=text.strip())
    db.add(comment)
    db.flush()
    db.refresh(comment)
    return comment


def update_comment(db: Session, comment_id: uuid.UUID, opl_id: uuid.UUID, user_id: uuid.UUID, text: str) -> Optional[Comment]:
    comment = db.get(Comment, comment_id)
    if not comment:
        return None
    if comment.opl_id != opl_id:
        return None
    if comment.deleted_at is not None:
        return None
    if comment.user_id != user_id:
        return None
    comment.text = text.strip()
    db.flush()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, comment_id: uuid.UUID, opl_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    from datetime import datetime
    comment = db.get(Comment, comment_id)
    if not comment:
        return False
    if comment.opl_id != opl_id:
        return False
    if comment.user_id != user_id:
        return False
    comment.deleted_at = datetime.utcnow()
    db.flush()
    return True
