from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from app.models.opl import UUID, Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), nullable=False, unique=True)
    email = Column(String(255), nullable=True)
    is_local = Column(Boolean, default=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    ldap_dn = Column(String(500), nullable=True)
    surname = Column(String(100), nullable=True)
    given_name = Column(String(100), nullable=True)
    title = Column(String(200), nullable=True)
    department = Column(String(200), nullable=True)
    employee_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    opls = relationship("Opl", back_populates="author")
