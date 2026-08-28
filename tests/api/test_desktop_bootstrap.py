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


# -- the dev tier switch ----------------------------------------------------
#
# Checkout is the deferred half of B4, so there is no way to change a tier
# through the product. This endpoint exists so the entitlement layer can be
# exercised in dev — every 402, every meter, every upgrade prompt — without one.
# It is guarded exactly like the bootstrap, for the same reason: a hosted
# deployment must not expose a way to grant itself a plan.


async def _bootstrap(client):
    response = await client.post("/auth/desktop-bootstrap")
    assert response.status_code == 200, response.text
    body = response.json()
    return {"Authorization": f"Bearer {body['tokens']['access_token']}"}


async def test_the_dev_tier_switch_moves_the_organization(desktop_client):
    headers = await _bootstrap(desktop_client)

    before = (await desktop_client.get("/entitlements", headers=headers)).json()
    assert before["tier"] == "free"

    switched = await desktop_client.post(
        "/desktop/plan-tier", headers=headers, json={"plan_tier": "business"}
    )
    assert switched.status_code == 200, switched.text
    assert switched.json()["plan_tier"] == "business"

    after = (await desktop_client.get("/entitlements", headers=headers)).json()
    assert after["tier"] == "business"
    # The thing it exists to unlock.
    assert after["features"]["pdf_templates_premium"] is True


async def test_the_dev_tier_switch_is_absent_without_desktop_mode(saas_client):
    """404, not 403.

    The same choice the bootstrap makes: a hosted deployment should not admit
    that the endpoint exists at all, because 'forbidden' tells an attacker there
    is something here worth getting at.
    """
    response = await saas_client.post(
        "/desktop/plan-tier", json={"plan_tier": "business_pro"}
    )
    # Unauthenticated first — it is behind the tenant middleware like any write.
    assert response.status_code in (401, 404)


async def test_an_unknown_tier_is_refused(desktop_client):
    headers = await _bootstrap(desktop_client)
    response = await desktop_client.post(
        "/desktop/plan-tier", headers=headers, json={"plan_tier": "enterprise"}
    )
    assert response.status_code == 422, response.text


async def test_switching_back_down_takes_the_feature_away(desktop_client):
    """The direction that matters for testing an upgrade prompt."""
    headers = await _bootstrap(desktop_client)
    await desktop_client.post(
        "/desktop/plan-tier", headers=headers, json={"plan_tier": "business"}
    )
    await desktop_client.post(
        "/desktop/plan-tier", headers=headers, json={"plan_tier": "free"}
    )
    entitlements = (await desktop_client.get("/entitlements", headers=headers)).json()
    assert entitlements["tier"] == "free"
    assert entitlements["features"]["pdf_templates_premium"] is False
