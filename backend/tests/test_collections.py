from __future__ import annotations

import uuid

import pytest


# ========================
#  COLLECTIONS CRUD
# ========================

class TestCollectionCRUD:
    def test_create_collection(self, client):
        resp = client.post("/api/collections/", json={
            "title": "Collection 1",
            "description": "Test collection",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Collection 1"
        assert data["description"] == "Test collection"
        assert "id" in data
        assert "created_at" in data

    def test_create_collection_minimal(self, client):
        resp = client.post("/api/collections/", json={"title": "Only title"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Only title"
        assert data["description"] is None

    def test_list_collections_empty(self, client):
        resp = client.get("/api/collections/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_collections(self, client):
        client.post("/api/collections/", json={"title": "A"})
        client.post("/api/collections/", json={"title": "B"})
        resp = client.get("/api/collections/")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_get_collection(self, client):
        coll = client.post("/api/collections/", json={"title": "Test"}).json()
        resp = client.get(f"/api/collections/{coll['id']}")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Test"
        assert "items" in resp.json()

    def test_get_collection_404(self, client):
        resp = client.get(f"/api/collections/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_update_collection(self, client):
        coll = client.post("/api/collections/", json={"title": "Old"}).json()
        resp = client.patch(f"/api/collections/{coll['id']}", json={"title": "New"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "New"

    def test_update_collection_404(self, client):
        resp = client.patch(f"/api/collections/{uuid.uuid4()}", json={"title": "X"})
        assert resp.status_code == 404

    def test_delete_collection(self, client):
        coll = client.post("/api/collections/", json={"title": "Delete me"}).json()
        resp = client.delete(f"/api/collections/{coll['id']}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert client.get(f"/api/collections/{coll['id']}").status_code == 404


# ========================
#  COLLECTION <-> OPL LINKS
# ========================

class TestCollectionOplLinks:
    def test_link_opl_to_collection(self, client, test_collection):
        opl_resp = client.post("/api/opls/", json={
            "title": "OPL 1",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        })
        opl_id = opl_resp.json()["id"]
        resp = client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl_id})
        assert resp.status_code == 201
        data = resp.json()
        assert data["opl_id"] == opl_id
        assert data["collection_id"] == str(test_collection.id)

    def test_link_opl_duplicate(self, client, test_collection):
        opl_resp = client.post("/api/opls/", json={
            "title": "OPL",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = opl_resp.json()["id"]
        client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl_id})
        resp = client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl_id})
        # Should return 400 for duplicate link
        assert resp.status_code == 400

    def test_link_opl_to_nonexistent_collection(self, client):
        opl_resp = client.post("/api/opls/", json={
            "title": "T",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        resp = client.post(f"/api/collections/{uuid.uuid4()}/opls", json={"opl_id": opl_resp.json()["id"]})
        assert resp.status_code == 404

    def test_link_nonexistent_opl(self, client, test_collection):
        resp = client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": str(uuid.uuid4())})
        assert resp.status_code == 404

    def test_unlink_opl_from_collection(self, client, test_collection):
        opl_resp = client.post("/api/opls/", json={
            "title": "OPL",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
        })
        opl_id = opl_resp.json()["id"]
        client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl_id})
        resp = client.delete(f"/api/collections/{test_collection.id}/opls/{opl_id}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_unlink_opl_not_linked(self, client, test_collection):
        resp = client.delete(f"/api/collections/{test_collection.id}/opls/{uuid.uuid4()}")
        assert resp.status_code == 404


# ========================
#  COLLECTION SCOPED OPL LIST
# ========================

class TestCollectionOplList:
    def test_opls_list_empty_collection(self, client, test_collection):
        resp = client.get(f"/api/collections/{test_collection.id}/opls-list")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_opls_list_with_items(self, client, test_collection):
        opl1 = client.post("/api/opls/", json={
            "title": "First OPL",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        }).json()
        opl2 = client.post("/api/opls/", json={
            "title": "Second OPL",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 20}],
        }).json()

        client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl1["id"]})
        client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl2["id"]})

        resp = client.get(f"/api/collections/{test_collection.id}/opls-list")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 2

    def test_opls_list_search_by_title(self, client, test_collection):
        opl1 = client.post("/api/opls/", json={
            "title": "Pump Repair",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        }).json()
        opl2 = client.post("/api/opls/", json={
            "title": "Motor Check",
            "steps": [{"step_number": 1, "description": "d", "duration_sec": 10}],
        }).json()

        client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl1["id"]})
        client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl2["id"]})

        resp = client.get(f"/api/collections/{test_collection.id}/opls-list?title=Pump")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Pump Repair"

    def test_opls_list_nonexistent_collection(self, client):
        resp = client.get(f"/api/collections/{uuid.uuid4()}/opls-list")
        assert resp.status_code == 404

    def test_opls_list_pagination(self, client, test_collection):
        for i in range(5):
            opl = client.post("/api/opls/", json={
                "title": f"OPL {i}",
                "steps": [{"step_number": 1, "description": "d", "duration_sec": 5}],
            }).json()
            client.post(f"/api/collections/{test_collection.id}/opls", json={"opl_id": opl["id"]})

        resp = client.get(f"/api/collections/{test_collection.id}/opls-list?skip=0&limit=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5


# ========================
#  COLLECTION SCOPED TAGS
# ========================

class TestCollectionScopedTags:
    def test_list_tags_empty(self, client, test_collection):
        resp = client.get(f"/api/collections/{test_collection.id}/tags")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_tag_in_collection(self, client, test_collection):
        resp = client.post(f"/api/collections/{test_collection.id}/tags", json={
            "name": "Safety",
            "color": "#f44336",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Safety"
        assert data["color"] == "#f44336"
        assert "id" in data

    def test_create_tag_duplicate_in_collection(self, client, test_collection):
        client.post(f"/api/collections/{test_collection.id}/tags", json={"name": "Unique", "color": "#000"})
        resp = client.post(f"/api/collections/{test_collection.id}/tags", json={"name": "Unique", "color": "#fff"})
        assert resp.status_code == 400

    def test_delete_tag_in_collection(self, client, test_collection):
        tag = client.post(f"/api/collections/{test_collection.id}/tags", json={
            "name": "ToDelete",
            "color": "#000",
        }).json()
        resp = client.delete(f"/api/collections/{test_collection.id}/tags/{tag['id']}")
        assert resp.status_code == 200
        assert client.get(f"/api/collections/{test_collection.id}/tags").json() == []

    def test_delete_tag_wrong_collection(self, client, test_collection, db_session):
        from app.models.opl import OplCollection
        other_coll = OplCollection(id=uuid.uuid4(), title="Other")
        db_session.add(other_coll)
        db_session.commit()

        tag = client.post(f"/api/collections/{test_collection.id}/tags", json={
            "name": "Scoped",
            "color": "#000",
        }).json()
        resp = client.delete(f"/api/collections/{other_coll.id}/tags/{tag['id']}")
        assert resp.status_code == 404

    def test_tags_isolated_between_collections(self, client, test_collection, db_session):
        from app.models.opl import OplCollection
        other_coll = OplCollection(id=uuid.uuid4(), title="Other")
        db_session.add(other_coll)
        db_session.commit()

        client.post(f"/api/collections/{test_collection.id}/tags", json={"name": "A", "color": "#111"})
        client.post(f"/api/collections/{other_coll.id}/tags", json={"name": "B", "color": "#222"})

        tags1 = client.get(f"/api/collections/{test_collection.id}/tags").json()
        tags2 = client.get(f"/api/collections/{other_coll.id}/tags").json()

        assert len(tags1) == 1
        assert tags1[0]["name"] == "A"
        assert len(tags2) == 1
        assert tags2[0]["name"] == "B"
