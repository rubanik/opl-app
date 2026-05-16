from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
import logging
import bcrypt

from ldap3 import Server, Connection, SUBTREE, ALL
from ldap3.core.exceptions import LDAPException
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy import select

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger(__name__)


def escape_ldap_filter(value: str) -> str:
    return value.replace("\\", "\\5c").replace("(", "\\28").replace(")", "\\29").replace("*", "\\2a").replace("\x00", "\\00")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_refresh_minutes)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def authenticate_ldap(username: str, password: str) -> dict | None:
    if not settings.ldap_server:
        return None
    try:
        use_ssl = settings.ldap_use_ssl
        server = Server(
            settings.ldap_server,
            port=settings.ldap_port,
            use_ssl=use_ssl,
            get_info=ALL,
            connect_timeout=10,
        )

        # --- Mode 1: User-bind (template, like Grafana) ---
        if settings.ldap_user_dn_template:
            user_dn = settings.ldap_user_dn_template.replace("%s", username)
            logger.info(f"LDAP user-bind for {username}: dn={user_dn}")
            user_conn = Connection(
                server,
                user=user_dn,
                password=password,
                authentication="SIMPLE",
                auto_bind=False,
            )
            if not user_conn.bind():
                logger.info(f"LDAP user-bind failed for {username}")
                user_conn.unbind()
                return None

            # Fetch user attributes after successful bind
            attrs = {}
            try:
                user_conn.search(
                    search_base=user_dn,
                    search_filter="(objectClass=person)",
                    search_scope="BASE",
                    attributes=["sn", "givenName", "title", "mail", "department", "extensionAttribute9"],
                )
                if user_conn.entries:
                    entry = user_conn.entries[0]
                    for attr in ["sn", "givenName", "title", "mail", "department", "extensionAttribute9"]:
                        val = entry[attr].value if attr in entry else None
                        if val:
                            attrs[attr] = str(val)
            except Exception as e:
                logger.warning(f"LDAP attribute fetch failed for {username}: {type(e).__name__}: {e}")

            user_conn.unbind()
            logger.info(f"LDAP user-bind OK for {username}, attrs: {attrs}")
            return {
                "username": username,
                "email": attrs.get("mail"),
                "display_name": attrs.get("givenName", username),
                "ldap_dn": user_dn,
                "surname": attrs.get("sn"),
                "given_name": attrs.get("givenName"),
                "title": attrs.get("title"),
                "department": attrs.get("department"),
                "employee_id": attrs.get("extensionAttribute9"),
            }

        # --- Mode 2: Service-account bind + search (legacy) ---
        if not settings.ldap_base_dn or not settings.ldap_bind_password:
            return None

        logger.info(f"LDAP service-bind for {username}: server={settings.ldap_server}:{settings.ldap_port}")
        conn = Connection(
            server,
            user=settings.ldap_bind_dn,
            password=settings.ldap_bind_password,
            authentication="SIMPLE",
            auto_bind="READ_ONLY",
        )
        logger.info(f"LDAP service-bind OK, searching user={username}")
        search_base = settings.ldap_search_base or settings.ldap_base_dn
        search_filter = settings.ldap_user_search.format(username=escape_ldap_filter(username))
        conn.search(
            search_base=search_base,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=["dn", "mail", "displayName"],
        )
        if not conn.entries:
            logger.info(f"LDAP search returned 0 entries for {username} (base={search_base}, filter={search_filter})")
            conn.close()
            return None
        entry = conn.entries[0]
        user_dn = str(entry.entry_dn)
        logger.info(f"LDAP search found {user_dn} for {username}")
        user_conn = Connection(
            server,
            user=user_dn,
            password=password,
            authentication="SIMPLE",
        )
        if not user_conn.bind():
            logger.info(f"LDAP user-bind failed for {user_dn}")
            conn.close()
            return None
        email = str(entry.mail) if hasattr(entry, 'mail') and entry.mail else None
        display_name = str(entry.displayName) if hasattr(entry, 'displayName') and entry.displayName else username
        conn.close()
        user_conn.close()
        logger.info(f"LDAP auth OK for {username}")
        return {
            "username": username,
            "email": email,
            "display_name": display_name,
            "ldap_dn": user_dn,
        }
    except LDAPException as e:
        logger.error(f"LDAP error for {username}: {type(e).__name__}: {e}")
        return None
    except Exception as e:
        logger.error(f"LDAP connection error for {username}: {type(e).__name__}: {e}")
        return None


def authenticate_local(db, username: str, password: str) -> User | None:
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user or not user.is_local or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_current_user(
    access_token: str | None = Cookie(default=None),
    db=Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    payload = decode_token(access_token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        )
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    return user
