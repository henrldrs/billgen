import httpx

from api.config import Settings
from api.main import create_app
from db.engine import make_engine
from db.models import Base


async def test_rate_limit_kicks_in_and_health_stays_exempt():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    settings = Settings(
        database_url="sqlite://",
        jwt_secret="test-secret-0123456789abcdef-0123456789",
        rate_limit_per_minute=3,
    )
    app = create_app(settings=settings, engine=engine)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for _ in range(3):
            response = await client.post(
                "/auth/login",
                json={"email": "ghost@example.com", "password": "wrong-pass"},
            )
            assert response.status_code == 401

        throttled = await client.post(
            "/auth/login",
            json={"email": "ghost@example.com", "password": "wrong-pass"},
        )
        assert throttled.status_code == 429

        health = await client.get("/healthz")
        assert health.status_code == 200
    engine.dispose()
