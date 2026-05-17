from __future__ import annotations

from fastapi import APIRouter

from app.api.routes.opl import router as opl_router
from app.api.routes.auth import router as auth_router
from app.api.routes.collections import router as collections_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(collections_router)
api_router.include_router(opl_router)
