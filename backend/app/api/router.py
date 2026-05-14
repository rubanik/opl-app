from __future__ import annotations

from fastapi import APIRouter

from app.api.routes.opl import router as opl_router

api_router = APIRouter()
api_router.include_router(opl_router)
