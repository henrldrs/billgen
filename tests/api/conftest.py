import httpx
import pytest

from api.config import Settings
from api.main import create_app
from db.engine import make_engine
from db.models import Base


@pytest.fixture()
async def client():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    settings = Settings(
        database_url="sqlite://",
        jwt_secret="test-secret-0123456789abcdef-0123456789",
        jwt_access_ttl_min=15,
        jwt_refresh_ttl_days=30,
    )
    app = create_app(settings=settings, engine=engine)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    engine.dispose()


async def signup(
    client: httpx.AsyncClient,
    email: str = "alice@example.com",
    password: str = "s3cret-pass",
    display_name: str = "Alice",
    organization_name: str = "Acme SPRL",
) -> dict:
    response = await client.post(
        "/auth/signup",
        json={
            "email": email,
            "password": password,
            "display_name": display_name,
            "organization_name": organization_name,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def bearer(payload: dict) -> dict:
    return {"Authorization": f"Bearer {payload['tokens']['access_token']}"}
