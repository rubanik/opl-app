from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.models.opl import Comment


def get_opl_comment_count(db: Session, opl_id: uuid.UUID) -> int:
    return db.execute(
        select(func.count()).where(Comment.opl_id == opl_id)
    ).scalar() or 0


def list_opl_comments(db: Session, opl_id: uuid.UUID) -> list[Comment]:
    stmt = (
        select(Comment)
        .where(Comment.opl_id == opl_id)
        .options(joinedload(Comment.author))
        .order_by(Comment.created_at.asc())
    )
    return db.execute(stmt).scalars().unique().all()


def create_comment(db: Session, opl_id: uuid.UUID, user_id: uuid.UUID, text: str) -> Comment:
    comment = Comment(opl_id=opl_id, user_id=user_id, text=text.strip())
    db.add(comment)
    db.flush()
    db.refresh(comment)
    return comment


def update_comment(db: Session, comment_id: uuid.UUID, user_id: uuid.UUID, text: str) -> Optional[Comment]:
    comment = db.get(Comment, comment_id)
    if not comment or comment.user_id != user_id:
        return None
    comment.text = text.strip()
    db.flush()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, comment_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    comment = db.get(Comment, comment_id)
    if not comment or comment.user_id != user_id:
        return False
    db.delete(comment)
    db.flush()
    return True
