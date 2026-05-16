from __future__ import annotations

import uuid
import os
import shutil
import tempfile
from io import BytesIO
from unittest.mock import patch

import pytest

from app.services.storage import upload_photo, download_photo, delete_photo


@pytest.fixture
def tmp_storage_dir(monkeypatch):
    d = tempfile.mkdtemp()
    monkeypatch.setattr("app.services.storage._STORAGE_DIR", d)
    yield d
    shutil.rmtree(d, ignore_errors=True)


class TestFSUploadPhoto:
    def test_upload_photo_to_fs(self, client, sample_image_bytes, tmp_storage_dir):
        create_resp = client.post("/api/opls/", json={
            "title": "FS Photo",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            resp = client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("test.jpg", f, "image/jpeg")},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mime_type"] == "image/jpeg"
        assert data["display_order"] == 0

    def test_upload_stores_in_db_fallback_testing(self, client, sample_image_bytes):
        """In TESTING mode, photo data is stored in DB (data column)."""
        create_resp = client.post("/api/opls/", json={
            "title": "Fallback",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            resp = client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("test.jpg", f, "image/jpeg")},
            )
        assert resp.status_code == 200
        photo_id = resp.json()["id"]

        get_resp = client.get(f"/api/opls/{opl_id}/photos/{photo_id}")
        assert get_resp.status_code == 200
        assert get_resp.content == sample_image_bytes


class TestFSGetPhoto:
    def test_get_photo_from_fs(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "FS GET",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            photo_resp = client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("t.jpg", f, "image/jpeg")},
            )
        photo_id = photo_resp.json()["id"]

        resp = client.get(f"/api/opls/{opl_id}/photos/{photo_id}")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"
        assert resp.content == sample_image_bytes

    def test_get_photo_nonexistent(self, client):
        resp = client.get(f"/api/opls/{uuid.uuid4()}/photos/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestFSDeletePhoto:
    def test_delete_photo_removes_from_fs(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "FS Del",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            photo_resp = client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("t.jpg", f, "image/jpeg")},
            )
        photo_id = photo_resp.json()["id"]

        resp = client.delete(f"/api/opls/steps/{step_id}/photos/{photo_id}")
        assert resp.status_code == 200
        assert client.get(f"/api/opls/{opl_id}/photos/{photo_id}").status_code == 404

    def test_delete_photo_nonexistent(self, client):
        resp = client.delete(f"/api/opls/steps/{uuid.uuid4()}/photos/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestFSReplacePhoto:
    def test_replace_photo_updates_fs(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "FS Replace",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            photo_resp = client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("orig.jpg", f, "image/jpeg")},
            )
        photo_id = photo_resp.json()["id"]

        from PIL import Image
        buf = BytesIO()
        Image.new("RGB", (100, 100), color="blue").save(buf, format="JPEG")
        buf.seek(0)
        new_bytes = buf.read()

        with BytesIO(new_bytes) as f:
            resp = client.put(
                f"/api/opls/{opl_id}/steps/{step_id}/photos/{photo_id}",
                files={"file": ("repl.jpg", f, "image/jpeg")},
            )
        assert resp.status_code == 200

        get_resp = client.get(f"/api/opls/{opl_id}/photos/{photo_id}")
        assert get_resp.status_code == 200
        assert get_resp.content == new_bytes

    def test_replace_photo_nonexistent(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        with BytesIO(sample_image_bytes) as f:
            resp = client.put(
                f"/api/opls/{create_resp.json()['id']}/steps/{uuid.uuid4()}/photos/{uuid.uuid4()}",
                files={"file": ("x.jpg", f, "image/jpeg")},
            )
        assert resp.status_code == 404


class TestStorageModule:
    def test_upload_photo_writes_file(self, tmp_storage_dir):
        key = "test_upload.jpg"
        data = b"fake image data"
        upload_photo(key, data, "image/jpeg")

        path = os.path.join(tmp_storage_dir, key)
        assert os.path.exists(path)
        with open(path, "rb") as f:
            assert f.read() == data

    def test_download_photo_reads_file(self, tmp_storage_dir):
        key = "test_download.png"
        path = os.path.join(tmp_storage_dir, key)
        with open(path, "wb") as f:
            f.write(b"image content")

        body, mime = download_photo(key)
        assert body == b"image content"
        assert mime == "image/png"

    def test_delete_photo_removes_file(self, tmp_storage_dir):
        key = "test_delete.jpg"
        path = os.path.join(tmp_storage_dir, key)
        with open(path, "wb") as f:
            f.write(b"remove me")

        delete_photo(key)
        assert not os.path.exists(path)

    def test_delete_photo_missing_file_no_error(self, tmp_storage_dir):
        delete_photo("does_not_exist.jpg")

    def test_mime_guessing(self, tmp_storage_dir):
        for ext, expected_mime in [
            (".jpg", "image/jpeg"),
            (".jpeg", "image/jpeg"),
            (".png", "image/png"),
            (".gif", "image/gif"),
            (".webp", "image/webp"),
            (".svg", "image/svg+xml"),
            (".xyz", "application/octet-stream"),
        ]:
            key = f"test{ext}"
            upload_photo(key, b"data", "application/octet-stream")
            _, mime = download_photo(key)
            assert mime == expected_mime, f"Expected {expected_mime} for {ext}, got {mime}"


class TestPhotoCascadeWithFS:
    def test_delete_opl_cascades_photos(self, client, sample_image_bytes, db_session):
        from app.models.opl import Photo
        create_resp = client.post("/api/opls/", json={
            "title": "Cascade FS",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("c.jpg", f, "image/jpeg")},
            )

        client.delete(f"/api/opls/{opl_id}")

        remaining = db_session.query(Photo).filter(Photo.step_id == step_id).count()
        assert remaining == 0

    def test_multiple_photos_fs_workflow(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "Multi FS",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        uploaded_ids = []
        for i in range(3):
            with BytesIO(sample_image_bytes) as f:
                resp = client.post(
                    f"/api/opls/{opl_id}/steps/{step_id}/photos?order={i}",
                    files={"file": (f"p{i}.jpg", f, "image/jpeg")},
                )
            assert resp.status_code == 200
            uploaded_ids.append(resp.json()["id"])

        detail = client.get(f"/api/opls/{opl_id}").json()
        assert len(detail["steps"][0]["photos"]) == 3

        from PIL import Image
        buf = BytesIO()
        Image.new("RGB", (100, 100), color="green").save(buf, format="JPEG")
        buf.seek(0)
        new_bytes = buf.read()
        with BytesIO(new_bytes) as f:
            resp = client.put(
                f"/api/opls/{opl_id}/steps/{step_id}/photos/{uploaded_ids[1]}",
                files={"file": ("replaced.jpg", f, "image/jpeg")},
            )
        assert resp.status_code == 200

        get_resp = client.get(f"/api/opls/{opl_id}/photos/{uploaded_ids[1]}")
        assert get_resp.content == new_bytes

        resp = client.delete(f"/api/opls/steps/{step_id}/photos/{uploaded_ids[2]}")
        assert resp.status_code == 200

        detail = client.get(f"/api/opls/{opl_id}").json()
        assert len(detail["steps"][0]["photos"]) == 2
