from __future__ import annotations

import uuid
from io import BytesIO

import pytest


# ========================
#  CREATE OPL
# ========================

class TestCreateOpl:
    def test_create_opl_with_steps(self, client):
        payload = {
            "title": "Тестовая инструкция",
            "description": "Описание",
            "steps": [
                {"step_number": 1, "description": "Шаг 1", "duration_sec": 30},
                {"step_number": 2, "description": "Шаг 2", "duration_sec": 60},
                {"step_number": 3, "description": "Шаг 3", "duration_sec": 45},
                {"step_number": 4, "description": "Шаг 4", "duration_sec": 15},
            ],
        }
        resp = client.post("/api/opls/", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Тестовая инструкция"
        assert data["description"] == "Описание"
        assert len(data["steps"]) == 4
        assert data["steps"][0]["step_number"] == 1
        assert data["steps"][0]["description"] == "Шаг 1"
        assert data["steps"][0]["duration_sec"] == 30
        assert data["steps"][3]["step_number"] == 4
        assert len(data["steps"][0]["photos"]) == 0
        assert "id" in data

    def test_create_opl_minimal(self, client):
        payload = {
            "title": "Без описания",
            "steps": [
                {"step_number": 1, "description": "Единственный шаг", "duration_sec": 0},
            ],
        }
        resp = client.post("/api/opls/", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Без описания"
        assert data["description"] is None
        assert len(data["steps"]) == 1

    def test_create_opl_empty_title_rejected(self, client):
        payload = {
            "title": "",
            "steps": [],
        }
        resp = client.post("/api/opls/", json=payload)
        assert resp.status_code == 422


# ========================
#  LIST OPLS
# ========================

class TestListOpls:
    def test_empty_list(self, client):
        resp = client.get("/api/opls/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_shows_created(self, client):
        client.post("/api/opls/", json={
            "title": "Первая",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        client.post("/api/opls/", json={
            "title": "Вторая",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        resp = client.get("/api/opls/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["title"] == "Вторая"
        assert data[0]["step_count"] == 1
        assert data[1]["title"] == "Первая"


# ========================
#  GET OPL
# ========================

class TestGetOpl:
    def test_get_existing_opl(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "GET тест",
            "steps": [
                {"step_number": 1, "description": "A", "duration_sec": 20},
                {"step_number": 2, "description": "B", "duration_sec": 40},
            ],
        })
        opl_id = create_resp.json()["id"]
        resp = client.get(f"/api/opls/{opl_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "GET тест"
        assert len(data["steps"]) == 2
        assert data["steps"][0]["description"] == "A"

    def test_get_nonexistent(self, client):
        resp = client.get(f"/api/opls/{uuid.uuid4()}")
        assert resp.status_code == 404


# ========================
#  DELETE OPL
# ========================

class TestDeleteOpl:
    def test_delete_existing(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "К удалению",
            "steps": [{"step_number": 1, "description": "x", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        resp = client.delete(f"/api/opls/{opl_id}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        assert client.get(f"/api/opls/{opl_id}").status_code == 404
        assert len(client.get("/api/opls/").json()) == 0

    def test_delete_cascades_steps(self, client, db_session):
        from app.models.opl import Step
        create_resp = client.post("/api/opls/", json={
            "title": "Cascade",
            "steps": [
                {"step_number": 1, "description": "s1", "duration_sec": 10},
                {"step_number": 2, "description": "s2", "duration_sec": 20},
            ],
        })
        opl_id = create_resp.json()["id"]
        client.delete(f"/api/opls/{opl_id}")

        remaining_steps = db_session.query(Step).filter(Step.opl_id == opl_id).count()
        assert remaining_steps == 0

    def test_delete_nonexistent(self, client):
        resp = client.delete(f"/api/opls/{uuid.uuid4()}")
        assert resp.status_code == 404


# ========================
#  PHOTO UPLOAD
# ========================

class TestPhotoUpload:
    def test_upload_photo(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "Фото тест",
            "steps": [{"step_number": 1, "description": "Шаг с фото", "duration_sec": 30}],
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

    def test_photo_shows_in_opl_detail(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "Фото в деталях",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("p.jpg", f, "image/jpeg")},
            )

        detail = client.get(f"/api/opls/{opl_id}").json()
        assert len(detail["steps"][0]["photos"]) == 1

    def test_upload_wrong_step(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        fake_step_id = str(uuid.uuid4())

        with BytesIO(sample_image_bytes) as f:
            resp = client.post(
                f"/api/opls/{opl_id}/steps/{fake_step_id}/photos?order=0",
                files={"file": ("x.jpg", f, "image/jpeg")},
            )
        assert resp.status_code == 404

    def test_multiple_photos_same_step(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "Мульти фото",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        for i in range(3):
            with BytesIO(sample_image_bytes) as f:
                client.post(
                    f"/api/opls/{opl_id}/steps/{step_id}/photos?order={i}",
                    files={"file": (f"p{i}.jpg", f, "image/jpeg")},
                )

        detail = client.get(f"/api/opls/{opl_id}").json()
        assert len(detail["steps"][0]["photos"]) == 3


# ========================
#  GET PHOTO
# ========================

class TestGetPhoto:
    def test_retrieve_photo(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
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


# ========================
#  DELETE PHOTO
# ========================

class TestDeletePhoto:
    def test_delete_photo(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
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


# ========================
#  QR CODE
# ========================

class TestQrCode:
    def test_generate_qr(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "QR тест",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]

        resp = client.get(f"/api/opls/{opl_id}/qr")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"
        assert resp.content[:8] == b'\x89PNG\r\n\x1a\n'

    def test_qr_nonexistent_opl(self, client):
        resp = client.get(f"/api/opls/{uuid.uuid4()}/qr")
        assert resp.status_code == 404


# ========================
#  FULL WORKFLOW
# ========================

class TestFullWorkflow:
    def test_create_upload_view_delete(self, client, sample_image_bytes):
        # 1. Create
        create_resp = client.post("/api/opls/", json={
            "title": "Полный workflow",
            "description": "Тест полного цикла",
            "steps": [
                {"step_number": 1, "description": "Подготовка", "duration_sec": 60},
                {"step_number": 2, "description": "Выполнение", "duration_sec": 120},
                {"step_number": 3, "description": "Проверка", "duration_sec": 30},
                {"step_number": 4, "description": "Завершение", "duration_sec": 15},
            ],
        })
        assert create_resp.status_code == 201
        opl_id = create_resp.json()["id"]

        # 2. Upload photos to step 1
        step1 = create_resp.json()["steps"][0]
        with BytesIO(sample_image_bytes) as f:
            client.post(
                f"/api/opls/{opl_id}/steps/{step1['id']}/photos?order=0",
                files={"file": ("1.jpg", f, "image/jpeg")},
            )
            client.post(
                f"/api/opls/{opl_id}/steps/{step1['id']}/photos?order=1",
                files={"file": ("2.jpg", f, "image/jpeg")},
            )

        # 3. List contains it
        list_resp = client.get("/api/opls/")
        titles = [item["title"] for item in list_resp.json()]
        assert "Полный workflow" in titles

        # 4. Detail shows photos
        detail = client.get(f"/api/opls/{opl_id}").json()
        assert detail["steps"][0]["description"] == "Подготовка"
        assert len(detail["steps"][0]["photos"]) == 2
        assert detail["steps"][1]["description"] == "Выполнение"
        assert len(detail["steps"][1]["photos"]) == 0

        # 5. QR works
        qr_resp = client.get(f"/api/opls/{opl_id}/qr")
        assert qr_resp.status_code == 200

        # 6. Photo retrieval works
        photo_id = detail["steps"][0]["photos"][0]["id"]
        photo_resp = client.get(f"/api/opls/{opl_id}/photos/{photo_id}")
        assert photo_resp.status_code == 200

        # 7. Delete
        assert client.delete(f"/api/opls/{opl_id}").status_code == 200
        assert client.get(f"/api/opls/{opl_id}").status_code == 404


# ========================
#  SEARCH OPLS
# ========================

class TestSearchOpls:
    def test_search_by_title(self, client):
        client.post("/api/opls/", json={
            "title": "Замена ленты",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        client.post("/api/opls/", json={
            "title": "Проверка масла",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        resp = client.get("/api/opls/?title=ленты")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Замена ленты"

    def test_search_by_description(self, client):
        client.post("/api/opls/", json={
            "title": "A",
            "description": "Инструкция по замене",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        client.post("/api/opls/", json={
            "title": "B",
            "description": "Инструкция по настройке",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        resp = client.get("/api/opls/?description=замене")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "A"

    def test_search_case_insensitive(self, client):
        client.post("/api/opls/", json={
            "title": "Replacement Packaging",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        resp = client.get("/api/opls/?title=replacement")
        data = resp.json()
        assert len(data) == 1

    def test_search_no_match(self, client):
        client.post("/api/opls/", json={
            "title": "Test",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        resp = client.get("/api/opls/?title=xyz_nonexistent")
        data = resp.json()
        assert len(data) == 0

    def test_search_combined_or(self, client):
        client.post("/api/opls/", json={
            "title": "Title A",
            "description": "Desc B",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        resp = client.get("/api/opls/?title=Title A&description=Desc B")
        data = resp.json()
        assert len(data) == 1


# ========================
#  PATCH OPL
# ========================

class TestPatchOpl:
    def test_patch_title(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "Old title",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        resp = client.patch(f"/api/opls/{opl_id}", json={"title": "New title"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "New title"
        assert data["updated_at"] is not None

    def test_patch_description(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        resp = client.patch(f"/api/opls/{opl_id}", json={"description": "New desc"})
        assert resp.status_code == 200
        assert resp.json()["description"] == "New desc"

    def test_patch_both(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        resp = client.patch(f"/api/opls/{opl_id}", json={"title": "New T", "description": "New D"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "New T"
        assert data["description"] == "New D"

    def test_patch_nonexistent(self, client):
        resp = client.patch(f"/api/opls/{uuid.uuid4()}", json={"title": "X"})
        assert resp.status_code == 404


# ========================
#  PATCH STEP
# ========================

class TestPatchStep:
    def test_patch_step_description(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "Old desc", "duration_sec": 10}],
        })
        step_id = create_resp.json()["steps"][0]["id"]
        resp = client.patch(f"/api/opls/{create_resp.json()['id']}/steps/{step_id}",
                            json={"description": "New desc"})
        assert resp.status_code == 200
        assert resp.json()["description"] == "New desc"

    def test_patch_step_duration(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        step_id = create_resp.json()["steps"][0]["id"]
        resp = client.patch(f"/api/opls/{create_resp.json()['id']}/steps/{step_id}",
                            json={"duration_sec": 60})
        assert resp.status_code == 200
        assert resp.json()["duration_sec"] == 60

    def test_patch_step_nonexistent(self, client):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        resp = client.patch(f"/api/opls/{create_resp.json()['id']}/steps/{uuid.uuid4()}",
                            json={"description": "x"})
        assert resp.status_code == 404


# ========================
#  PUT PHOTO (replace)
# ========================

class TestReplacePhoto:
    def test_replace_photo(self, client, sample_image_bytes):
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        step_id = create_resp.json()["steps"][0]["id"]

        with BytesIO(sample_image_bytes) as f:
            photo_resp = client.post(
                f"/api/opls/{opl_id}/steps/{step_id}/photos?order=0",
                files={"file": ("original.jpg", f, "image/jpeg")},
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
                files={"file": ("replaced.jpg", f, "image/jpeg")},
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


# ========================
#  TAGS
# ========================

class TestTags:
    def test_create_tag(self, client):
        resp = client.post("/api/opls/tags", json={"name": "Оборудование", "color": "#f44336"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Оборудование"
        assert data["color"] == "#f44336"
        assert "id" in data

    def test_create_tag_duplicate(self, client):
        client.post("/api/opls/tags", json={"name": "Уникальный", "color": "#000"})
        resp = client.post("/api/opls/tags", json={"name": "Уникальный", "color": "#fff"})
        assert resp.status_code == 400

    def test_list_tags(self, client):
        client.post("/api/opls/tags", json={"name": "A", "color": "#111"})
        client.post("/api/opls/tags", json={"name": "B", "color": "#222"})
        resp = client.get("/api/opls/tags")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["name"] == "A"

    def test_delete_tag(self, client):
        tag_resp = client.post("/api/opls/tags", json={"name": "К удалению", "color": "#f00"})
        tag_id = tag_resp.json()["id"]
        resp = client.delete(f"/api/opls/tags/{tag_id}")
        assert resp.status_code == 200
        assert client.get("/api/opls/tags").json() == []

    def test_delete_tag_nonexistent(self, client):
        resp = client.delete(f"/api/opls/tags/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_link_tags_to_opl(self, client):
        tag1 = client.post("/api/opls/tags", json={"name": "T1", "color": "#111"}).json()
        tag2 = client.post("/api/opls/tags", json={"name": "T2", "color": "#222"}).json()
        create_resp = client.post("/api/opls/", json={
            "title": "OPL с тегами",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        resp = client.post(f"/api/opls/{opl_id}/tags", json={"tag_ids": [tag1["id"], tag2["id"]]})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tags"]) == 2
        names = sorted([t["name"] for t in data["tags"]])
        assert names == ["T1", "T2"]

    def test_link_tags_replaces_existing(self, client):
        tag1 = client.post("/api/opls/tags", json={"name": "T1"}).json()
        tag2 = client.post("/api/opls/tags", json={"name": "T2"}).json()
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = create_resp.json()["id"]
        client.post(f"/api/opls/{opl_id}/tags", json={"tag_ids": [tag1["id"]]})
        client.post(f"/api/opls/{opl_id}/tags", json={"tag_ids": [tag2["id"]]})
        resp = client.post(f"/api/opls/{opl_id}/tags", json={"tag_ids": [tag2["id"]]})
        assert len(resp.json()["tags"]) == 1
        assert resp.json()["tags"][0]["name"] == "T2"

    def test_create_opl_with_tags(self, client):
        tag = client.post("/api/opls/tags", json={"name": "Старт"}).json()
        resp = client.post("/api/opls/", json={
            "title": "OPL с тегами",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
            "tags": [tag["id"]],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["tags"]) == 1
        assert data["tags"][0]["name"] == "Старт"

    def test_tags_appear_in_list(self, client):
        tag = client.post("/api/opls/tags", json={"name": "Лист"}).json()
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
            "tags": [tag["id"]],
        })
        opl_id = create_resp.json()["id"]
        client.post(f"/api/opls/{opl_id}/tags", json={"tag_ids": [tag["id"]]})
        resp = client.get("/api/opls/")
        data = resp.json()
        opl_entry = [d for d in data if d["id"] == opl_id][0]
        assert len(opl_entry["tags"]) == 1
        assert opl_entry["tags"][0]["name"] == "Лист"

    def test_link_tags_nonexistent_opl(self, client):
        tag = client.post("/api/opls/tags", json={"name": "T"}).json()
        resp = client.post(f"/api/opls/{uuid.uuid4()}/tags", json={"tag_ids": [tag["id"]]})
        assert resp.status_code == 404

    def test_tags_cascade_delete(self, client, db_session):
        from app.models.opl import OplTagLink
        tag = client.post("/api/opls/tags", json={"name": "Cascade T"}).json()
        create_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
            "tags": [tag["id"]],
        })
        opl_id = create_resp.json()["id"]
        client.delete(f"/api/opls/{opl_id}")
        remaining = db_session.query(OplTagLink).filter(OplTagLink.opl_id == opl_id).count()
        assert remaining == 0
