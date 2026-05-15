from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status, Form
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.auth import (
    authenticate_ldap,
    authenticate_local,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    remember: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    remember_flag = remember and remember.lower() == 'true'

    ldap_info = authenticate_ldap(username, password)
    if ldap_info:
        user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if not user:
            user = User(
                username=username,
                email=ldap_info.get("email"),
                is_local=False,
                ldap_dn=ldap_info.get("ldap_dn"),
                created_at=datetime.now(timezone.utc),
                last_login=datetime.now(timezone.utc),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.last_login = datetime.now(timezone.utc)
            db.commit()
    else:
        user = authenticate_local(db, username, password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный логин или пароль",
            )
        user.last_login = datetime.now(timezone.utc)
        db.commit()

    access = create_access_token({"sub": str(user.id), "username": user.username})
    refresh = create_refresh_token({"sub": str(user.id)})
    access_max = settings.jwt_refresh_minutes * 60 if remember_flag else settings.jwt_access_minutes * 60

    response.set_cookie(
        key="access_token", value=access,
        httponly=True, secure=False, samesite="lax",
        max_age=access_max, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh,
        httponly=True, secure=False, samesite="lax",
        max_age=settings.jwt_refresh_minutes * 60, path="/",
    )
    return {
        "ok": True,
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_local": user.is_local,
        },
    }


@router.post("/register")
def register(
    response: Response,
    username: str,
    password: str,
    email: str | None = None,
    db: Session = Depends(get_db),
):
    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="Логин должен содержать минимум 3 символа")
    if not password or len(password) < 4:
        raise HTTPException(status_code=400, detail="Пароль должен содержать минимум 4 символа")
    existing = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Аккаунт с таким логином уже существует")
    user = User(
        username=username,
        email=email,
        is_local=True,
        password_hash=get_password_hash(password),
        created_at=datetime.now(timezone.utc),
        last_login=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access = create_access_token({"sub": str(user.id), "username": user.username})
    refresh = create_refresh_token({"sub": str(user.id)})
    response.set_cookie(
        key="access_token", value=access,
        httponly=True, secure=False, samesite="lax",
        max_age=settings.jwt_access_minutes * 60, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh,
        httponly=True, secure=False, samesite="lax",
        max_age=settings.jwt_refresh_minutes * 60, path="/",
    )
    return {
        "ok": True,
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_local": user.is_local,
        },
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "is_local": user.is_local,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"ok": True}
