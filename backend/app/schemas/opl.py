from __future__ import annotations

import uuid

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, computed_field

from app.services.markdown import render_markdown


class PhotoIn(BaseModel):
    display_order: int


class PhotoOut(BaseModel):
    id: uuid.UUID
    step_id: uuid.UUID
    display_order: int
    mime_type: str

    model_config = {"from_attributes": True}


class StepCreate(BaseModel):
    step_number: int
    title: str = ""
    description: str = ""
    duration_sec: int = 0
    photos: list[PhotoIn] = []


class StepOut(BaseModel):
    id: uuid.UUID
    opl_id: uuid.UUID
    step_number: int
    title: str
    description: str
    duration_sec: int
    photos: list[PhotoOut] = []

    @computed_field
    @property
    def description_html(self) -> Optional[str]:
        return render_markdown(self.description)

    model_config = {"from_attributes": True}


class OplTagOut(BaseModel):
    id: uuid.UUID
    name: str
    color: str

    model_config = {"from_attributes": True}


class AuthorOut(BaseModel):
    username: str
    surname: str | None = None
    given_name: str | None = None

    model_config = {"from_attributes": True}


class OplTagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = "#1976d2"


class OplTagLinkCreate(BaseModel):
    tag_ids: list[uuid.UUID]


class OplCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    steps: list[StepCreate]
    tags: list[uuid.UUID] = []


class OplOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: Optional[AuthorOut] = None
    steps: list[StepOut] = []
    tags: list[OplTagOut] = []

    model_config = {"from_attributes": True}


class OplUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class StepUpdate(BaseModel):
    step_number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration_sec: Optional[int] = None


class OplListOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    step_count: int
    total_duration_sec: int = 0
    author: Optional[AuthorOut] = None
    tags: list[OplTagOut] = []

    model_config = {"from_attributes": True}
