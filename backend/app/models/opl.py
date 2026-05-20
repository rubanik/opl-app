from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, LargeBinary, ForeignKey, DateTime, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, relationship


class UUID(TypeDecorator):
    """UUID that works with both PostgreSQL (native UUID) and SQLite (stored as TEXT)."""
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PGUUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def bind_processor(self, dialect):
        if dialect.name == "postgresql":
            return None
        def process(value):
            return str(value) if value is not None else None
        return process

    def result_processor(self, dialect, coltype):
        if dialect.name == "postgresql":
            return None
        def process(value):
            return uuid.UUID(value) if value is not None else None
        return process


class Base(DeclarativeBase):
    pass


class Opl(Base):
    __tablename__ = "opls"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(), ForeignKey("users.id"), nullable=True)

    steps = relationship("Step", back_populates="opl", cascade="all, delete-orphan",
                         order_by="Step.step_number")
    author = relationship("User", back_populates="opls")
    collection_links = relationship(
        "OplCollectionLink", back_populates="opl", cascade="all, delete-orphan"
    )


class Step(Base):
    __tablename__ = "steps"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    opl_id = Column(UUID(), ForeignKey("opls.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    duration_sec = Column(Integer, default=0)

    opl = relationship("Opl", back_populates="steps")
    photos = relationship("Photo", back_populates="step", cascade="all, delete-orphan",
                          order_by="Photo.display_order")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    step_id = Column(UUID(), ForeignKey("steps.id", ondelete="CASCADE"), nullable=False)
    display_order = Column(Integer, nullable=False)
    data = Column(LargeBinary, nullable=True)
    s3_key = Column(String(500), nullable=True)
    mime_type = Column(String(50), default="image/jpeg")

    step = relationship("Step", back_populates="photos")


class OplTag(Base):
    __tablename__ = "opl_tags"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#1976d2")
    collection_id = Column(UUID(), ForeignKey("opl_collections.id", ondelete="SET NULL"), nullable=True)


class OplCollection(Base):
    __tablename__ = "opl_collections"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    links = relationship(
        "OplCollectionLink", back_populates="collection", cascade="all, delete-orphan"
    )


class OplCollectionLink(Base):
    __tablename__ = "opl_collection_links"

    opl_id = Column(UUID(), ForeignKey("opls.id", ondelete="CASCADE"), primary_key=True)
    collection_id = Column(UUID(), ForeignKey("opl_collections.id", ondelete="CASCADE"), primary_key=True)

    opl = relationship("Opl", back_populates="collection_links")
    collection = relationship("OplCollection", back_populates="links")


class OplTagLink(Base):
    __tablename__ = "opl_tag_links"

    opl_id = Column(UUID(), ForeignKey("opls.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(UUID(), ForeignKey("opl_tags.id", ondelete="CASCADE"), primary_key=True)


Opl.tag_links = relationship(
    "OplTagLink", back_populates="opl", cascade="all, delete-orphan"
)
Opl.tags = relationship(
    "OplTag", secondary="opl_tag_links", back_populates="opls", overlaps="tag_links"
)
OplTag.opls = relationship(
    "Opl", secondary="opl_tag_links", back_populates="tags", overlaps="tag_links"
)
OplTag.opl_links = relationship(
    "OplTagLink", back_populates="tag", cascade="all, delete-orphan", overlaps="opls,tags"
)
OplTagLink.opl = relationship(
    "Opl", back_populates="tag_links", overlaps="opls,tags"
)
OplTagLink.tag = relationship(
    "OplTag", back_populates="opl_links", overlaps="opls,tags"
)


class Comment(Base):
    __tablename__ = "opl_comments"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    opl_id = Column(UUID(), ForeignKey("opls.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="comments")


Opl.comments = relationship(
    "Comment", back_populates="opl", cascade="all, delete-orphan"
)
Comment.opl = relationship(
    "Opl", back_populates="comments"
)

