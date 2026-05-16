from __future__ import annotations

import os
import io
from typing import Tuple

from app.core.config import settings


_STORAGE_DIR = settings.photo_storage_dir


def _ensure_dir():
    os.makedirs(_STORAGE_DIR, exist_ok=True)


def upload_photo(key: str, data: bytes, mime_type: str) -> str:
    _ensure_dir()
    path = os.path.join(_STORAGE_DIR, key)
    with open(path, "wb") as f:
        f.write(data)
    return key


def download_photo(key: str) -> Tuple[bytes, str]:
    path = os.path.join(_STORAGE_DIR, key)
    mime_type = _guess_mime(path)
    with open(path, "rb") as f:
        return f.read(), mime_type


def delete_photo(key: str) -> None:
    path = os.path.join(_STORAGE_DIR, key)
    if os.path.exists(path):
        os.remove(path)


def download_photo_to_bytesio(key: str) -> io.BytesIO:
    data, _ = download_photo(key)
    return io.BytesIO(data)


def _guess_mime(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    map_ = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
        ".svg": "image/svg+xml",
    }
    return map_.get(ext, "application/octet-stream")
