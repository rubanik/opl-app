"""Конфигурация для тестов: SQLite in-memory вместо PostgreSQL."""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["TESTING"] = "1"

import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.opl import Base, OplCollection, UserCollectionLink
from app.models.user import User
import pytest

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_user(db_session):
    user = User(
        id=uuid.uuid4(),
        username="test",
        email="test@test.local",
        is_local=True,
        password_hash="$2b$12$dummy",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def default_collection(db_session, test_user):
    coll = OplCollection(name="Общие", created_by=test_user.id)
    db_session.add(coll)
    db_session.flush()

    link = UserCollectionLink(user_id=test_user.id, collection_id=coll.id)
    db_session.add(link)
    db_session.commit()
    db_session.refresh(coll)
    return coll


@pytest.fixture
def client(db_session, test_user, default_collection):
    from app.main import create_app
    from app.db.session import get_db
    from app.services.auth import get_current_user
    from fastapi.testclient import TestClient

    app = create_app(init=False)

    def override_get_db():
        yield db_session

    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def default_collection_id(default_collection):
    return str(default_collection.id)


@pytest.fixture
def sample_image_bytes():
    from io import BytesIO
    from PIL import Image
    buf = BytesIO()
    img = Image.new("RGB", (100, 100), color="red")
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()
