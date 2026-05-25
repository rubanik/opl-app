from __future__ import annotations

import uuid

import pytest


# ========================
#  CREATE COMMENT
# ========================

class TestCreateComment:
    def test_create_comment(self, client, sample_opl):
        opl_id = sample_opl["id"]
        resp = client.post(f"/api/opls/{opl_id}/comments", json={"text": "Hello"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["text"] == "Hello"
        assert data["opl_id"] == opl_id
        assert "id" in data
        assert data["is_deleted"] is False

    def test_create_comment_no_auth(self, unauthenticated_client, sample_opl):
        opl_id = sample_opl["id"]
        resp = unauthenticated_client.post(f"/api/opls/{opl_id}/comments", json={"text": "No auth"})
        assert resp.status_code in (401, 403)


# ========================
#  LIST COMMENTS
# ========================

class TestListComments:
    def test_list_comments_empty(self, client, sample_opl):
        opl_id = sample_opl["id"]
        resp = client.get(f"/api/opls/{opl_id}/comments")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_comments_shows_created(self, client, sample_opl):
        opl_id = sample_opl["id"]
        client.post(f"/api/opls/{opl_id}/comments", json={"text": "First"})
        client.post(f"/api/opls/{opl_id}/comments", json={"text": "Second"})
        resp = client.get(f"/api/opls/{opl_id}/comments")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["text"] == "Second"
        assert data[1]["text"] == "First"

    def test_list_comments_no_auth(self, unauthenticated_client, sample_opl):
        opl_id = sample_opl["id"]
        resp = unauthenticated_client.get(f"/api/opls/{opl_id}/comments")
        assert resp.status_code == 200

    def test_list_comments_wrong_opl(self, client, sample_opl):
        resp = client.get(f"/api/opls/{uuid.uuid4()}/comments")
        assert resp.status_code == 404


# ========================
#  UPDATE COMMENT
# ========================

class TestUpdateComment:
    def test_update_own_comment(self, client, sample_opl):
        opl_id = sample_opl["id"]
        create = client.post(f"/api/opls/{opl_id}/comments", json={"text": "Old"}).json()
        comment_id = create["id"]
        resp = client.patch(f"/api/opls/{opl_id}/comments/{comment_id}", json={"text": "New"})
        assert resp.status_code == 200
        assert resp.json()["text"] == "New"

    def test_update_wrong_opl_id(self, client, sample_opl, db_session):
        from app.models.opl import Opl
        create = client.post(f"/api/opls/{sample_opl['id']}/comments", json={"text": "X"}).json()
        comment_id = create["id"]
        other_opl = Opl(id=uuid.uuid4(), title="Other")
        db_session.add(other_opl)
        db_session.commit()
        resp = client.patch(f"/api/opls/{other_opl.id}/comments/{comment_id}", json={"text": "Hacked"})
        assert resp.status_code == 404

    def test_update_soft_deleted_comment(self, client, sample_opl):
        opl_id = sample_opl["id"]
        create = client.post(f"/api/opls/{opl_id}/comments", json={"text": "Del"}).json()
        comment_id = create["id"]
        client.delete(f"/api/opls/{opl_id}/comments/{comment_id}")
        resp = client.patch(f"/api/opls/{opl_id}/comments/{comment_id}", json={"text": "Revived"})
        assert resp.status_code == 404


# ========================
#  DELETE COMMENT (SOFT)
# ========================

class TestDeleteComment:
    def test_soft_delete_comment(self, client, sample_opl):
        opl_id = sample_opl["id"]
        create = client.post(f"/api/opls/{opl_id}/comments", json={"text": "Remove me"}).json()
        comment_id = create["id"]
        resp = client.delete(f"/api/opls/{opl_id}/comments/{comment_id}")
        assert resp.status_code == 200

        list_resp = client.get(f"/api/opls/{opl_id}/comments")
        deleted_comment = [c for c in list_resp.json() if c["id"] == comment_id][0]
        assert deleted_comment["is_deleted"] is True
        assert deleted_comment["text"] == ""

    def test_soft_delete_wrong_opl_id(self, client, sample_opl, db_session):
        from app.models.opl import Opl
        create = client.post(f"/api/opls/{sample_opl['id']}/comments", json={"text": "X"}).json()
        comment_id = create["id"]
        other_opl = Opl(id=uuid.uuid4(), title="Other")
        db_session.add(other_opl)
        db_session.commit()
        resp = client.delete(f"/api/opls/{other_opl.id}/comments/{comment_id}")
        assert resp.status_code == 404

    def test_delete_nonexistent_comment(self, client, sample_opl):
        resp = client.delete(f"/api/opls/{sample_opl['id']}/comments/{uuid.uuid4()}")
        assert resp.status_code == 404


# ========================
#  COMMENT COUNT
# ========================

class TestCommentCount:
    def test_comment_count_in_detail(self, client, sample_opl):
        opl_id = sample_opl["id"]
        client.post(f"/api/opls/{opl_id}/comments", json={"text": "A"})
        client.post(f"/api/opls/{opl_id}/comments", json={"text": "B"})
        resp = client.get(f"/api/opls/{opl_id}")
        assert resp.json()["comment_count"] == 2

    def test_deleted_comment_not_counted(self, client, sample_opl):
        opl_id = sample_opl["id"]
        client.post(f"/api/opls/{opl_id}/comments", json={"text": "A"})
        c = client.post(f"/api/opls/{opl_id}/comments", json={"text": "B"}).json()
        client.delete(f"/api/opls/{opl_id}/comments/{c['id']}")
        resp = client.get(f"/api/opls/{opl_id}")
        assert resp.json()["comment_count"] == 1