import httpx
import pytest

from api.config import Settings
from api.main import create_app
from db.engine import make_engine
from db.models import Base


def _make_client(desktop_mode: bool) -> tuple[httpx.AsyncClient, object]:
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    settings = Settings(
        database_url="sqlite://",
        jwt_secret="test-secret-0123456789abcdef-0123456789",
        desktop_mode=desktop_mode,
    )
    app = create_app(settings=settings, engine=engine)
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test"), engine


@pytest.fixture()
async def desktop_client():
    client, engine = _make_client(desktop_mode=True)
    async with client:
        yield client
    engine.dispose()


@pytest.fixture()
async def saas_client():
    client, engine = _make_client(desktop_mode=False)
    async with client:
        yield client
    engine.dispose()


async def test_bootstrap_returns_working_session(desktop_client):
    response = await desktop_client.post("/auth/desktop-bootstrap")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["role"] == "owner"
    assert body["tokens"]["access_token"]

    me = await desktop_client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {body['tokens']['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["organization_id"] == body["organization_id"]


async def test_bootstrap_is_singleton(desktop_client):
    first = (await desktop_client.post("/auth/desktop-bootstrap")).json()
    second = (await desktop_client.post("/auth/desktop-bootstrap")).json()
    # same local org every time — not a fresh tenant per call
    assert first["organization_id"] == second["organization_id"]
    assert first["user_id"] == second["user_id"]


async def test_bootstrap_can_create_business_data(desktop_client):
    session = (await desktop_client.post("/auth/desktop-bootstrap")).json()
    headers = {"Authorization": f"Bearer {session['tokens']['access_token']}"}

    created = await desktop_client.post(
        "/companies", json={"name": "Acme Consulting"}, headers=headers
    )
    assert created.status_code == 201
    assert created.json()["organization_id"] == session["organization_id"]


async def test_bootstrap_404_when_desktop_mode_off(saas_client):
    response = await saas_client.post("/auth/desktop-bootstrap")
    assert response.status_code == 404
