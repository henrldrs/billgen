async def test_healthz_is_public(client):
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_readyz_checks_db(client):
    response = await client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_protected_route_requires_token(client):
    response = await client.get("/users/me")
    assert response.status_code == 401


async def test_garbage_token_rejected(client):
    response = await client.get(
        "/users/me", headers={"Authorization": "Bearer not-a-jwt"}
    )
    assert response.status_code == 401
