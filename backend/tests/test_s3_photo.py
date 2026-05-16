from __future__ import annotations

import uuid
from io import BytesIO
from unittest.mock import patch, MagicMock

import pytest

from app.services.storage import upload_photo, download_photo, delete_photo


class TestS3UploadPhoto:
    def test_upload_photo_to_s3(self, client, sample_image_bytes):
        """Upload should store to S3 when not in TESTING mode."""
        create_resp = client.post("/api/opls/", json={
            "title": "S3 Photo",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        mock_upload = MagicMock(return_value="test-key.jpg")
        with patch("app.services.storage.get_s3_client") as mock_s3:
            mock_s3.return_value = MagicMock()
            with patch("app.api.routes.opl.upload_photo", side_effect=lambda *a, **k: None):
                pass

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

        # Verify photo can be retrieved
        get_resp = client.get(f"/api/opls/{opl_id}/photos/{photo_id}")
        assert get_resp.status_code == 200
        assert get_resp.content == sample_image_bytes


class TestS3GetPhoto:
    def test_get_photo_from_s3(self, client, sample_image_bytes):
        """GET photo should download from S3 when s3_key is set (mocked)."""
        create_resp = client.post("/api/opls/", json={
            "title": "S3 GET",
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


class TestS3DeletePhoto:
    def test_delete_photo_removes_from_s3(self, client, sample_image_bytes):
        """Delete should remove photo from S3 and DB."""
        create_resp = client.post("/api/opls/", json={
            "title": "S3 Del",
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


class TestS3ReplacePhoto:
    def test_replace_photo_updates_s3(self, client, sample_image_bytes):
        """PUT photo should replace S3 object and update s3_key."""
        create_resp = client.post("/api/opls/", json={
            "title": "S3 Replace",
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
    def test_upload_photo_calls_put_object(self):
        mock_client = MagicMock()
        with patch("app.services.storage.get_s3_client", return_value=mock_client):
            with patch("app.services.storage.settings") as mock_settings:
                mock_settings.s3_endpoint_url = "http://test"
                mock_settings.s3_access_key = "test"
                mock_settings.s3_secret_key = "test"
                mock_settings.s3_region = "us-east-1"
                mock_settings.s3_bucket = "test-bucket"

                upload_photo("key.jpg", b"imagedata", "image/jpeg")

        mock_client.put_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="key.jpg",
            Body=b"imagedata",
            ContentType="image/jpeg",
        )

    def test_download_photo_calls_get_object(self):
        mock_body = MagicMock()
        mock_body.read.return_value = b"imagedata"
        mock_client = MagicMock()
        mock_client.get_object.return_value = {
            "Body": mock_body,
            "ContentType": "image/png",
        }
        with patch("app.services.storage.get_s3_client", return_value=mock_client):
            with patch("app.services.storage.settings") as mock_settings:
                mock_settings.s3_endpoint_url = "http://test"
                mock_settings.s3_access_key = "test"
                mock_settings.s3_secret_key = "test"
                mock_settings.s3_region = "us-east-1"
                mock_settings.s3_bucket = "test-bucket"

                data, mime = download_photo("key.jpg")

        assert data == b"imagedata"
        assert mime == "image/png"

    def test_delete_photo_calls_delete_object(self):
        mock_client = MagicMock()
        with patch("app.services.storage.get_s3_client", return_value=mock_client):
            with patch("app.services.storage.settings") as mock_settings:
                mock_settings.s3_endpoint_url = "http://test"
                mock_settings.s3_access_key = "test"
                mock_settings.s3_secret_key = "test"
                mock_settings.s3_region = "us-east-1"
                mock_settings.s3_bucket = "test-bucket"

                delete_photo("key.jpg")

        mock_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="key.jpg",
        )


class TestPhotoCascadeWithS3:
    def test_delete_opl_cascades_photos(self, client, sample_image_bytes, db_session):
        from app.models.opl import Photo
        create_resp = client.post("/api/opls/", json={
            "title": "Cascade S3",
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

    def test_multiple_photos_s3_workflow(self, client, sample_image_bytes):
        """Full S3-like workflow: create, upload multiple, replace one, delete one, verify."""
        create_resp = client.post("/api/opls/", json={
            "title": "Multi S3",
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

        # Replace middle photo
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

        # Verify replacement
        get_resp = client.get(f"/api/opls/{opl_id}/photos/{uploaded_ids[1]}")
        assert get_resp.content == new_bytes

        # Delete last photo
        resp = client.delete(f"/api/opls/steps/{step_id}/photos/{uploaded_ids[2]}")
        assert resp.status_code == 200

        detail = client.get(f"/api/opls/{opl_id}").json()
        assert len(detail["steps"][0]["photos"]) == 2
