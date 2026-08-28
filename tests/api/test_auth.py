from .conftest import bearer, signup


async def test_signup_returns_tokens_and_org(client):
    payload = await signup(client)
    assert payload["email"] == "alice@example.com"
    assert payload["organization_name"] == "Acme SPRL"
    assert payload["tokens"]["token_type"] == "bearer"
    assert payload["tokens"]["access_token"]
    assert payload["tokens"]["refresh_token"]
    assert payload["tokens"]["expires_in"] == 15 * 60


async def test_signup_token_works_immediately(client):
    payload = await signup(client)
    response = await client.get("/users/me", headers=bearer(payload))
    assert response.status_code == 200
    me = response.json()
    assert me["email"] == "alice@example.com"
    assert me["role"] == "owner"
    assert me["organization_id"] == payload["organization_id"]


async def test_duplicate_email_409(client):
    await signup(client)
    response = await client.post(
        "/auth/signup",
        json={
            "email": "alice@example.com",
            "password": "another-pass",
            "display_name": "Alice2",
            "organization_name": "Other Org",
        },
    )
    assert response.status_code == 409


async def test_short_password_422(client):
    response = await client.post(
        "/auth/signup",
        json={
            "email": "bob@example.com",
            "password": "short",
            "display_name": "Bob",
            "organization_name": "Bob Org",
        },
    )
    assert response.status_code == 422


async def test_login_roundtrip(client):
    await signup(client)
    response = await client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "s3cret-pass"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "owner"
    assert len(body["memberships"]) == 1

    me = await client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {body['tokens']['access_token']}"},
    )
    assert me.status_code == 200


async def test_login_email_is_case_insensitive(client):
    await signup(client)
    response = await client.post(
        "/auth/login",
        json={"email": "ALICE@Example.COM", "password": "s3cret-pass"},
    )
    assert response.status_code == 200


async def test_wrong_password_401(client):
    await signup(client)
    response = await client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


async def test_unknown_email_401_same_shape_as_wrong_password(client):
    response = await client.post(
        "/auth/login",
        json={"email": "ghost@example.com", "password": "whatever-pass"},
    )
    assert response.status_code == 401


async def test_refresh_rotation(client):
    payload = await signup(client)
    old_refresh = payload["tokens"]["refresh_token"]

    first = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert first.status_code == 200
    new_tokens = first.json()
    assert new_tokens["access_token"]

    # the old refresh token is single-use
    replay = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert replay.status_code == 401

    # the rotated one works
    second = await client.post(
        "/auth/refresh", json={"refresh_token": new_tokens["refresh_token"]}
    )
    assert second.status_code == 200


async def test_access_token_rejected_as_refresh(client):
    payload = await signup(client)
    response = await client.post(
        "/auth/refresh",
        json={"refresh_token": payload["tokens"]["access_token"]},
    )
    assert response.status_code == 401


async def test_logout_revokes_refresh(client):
    payload = await signup(client)
    refresh_token = payload["tokens"]["refresh_token"]

    response = await client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert response.status_code == 204

    replay = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert replay.status_code == 401


async def test_a_user_can_rename_themselves(client):
    headers = bearer(await signup(client))
    response = await client.patch(
        "/users/me", headers=headers, json={"display_name": "Henri Outai"}
    )
    assert response.status_code == 200, response.text
    assert response.json()["display_name"] == "Henri Outai"
    assert (await client.get("/users/me", headers=headers)).json()["display_name"] == (
        "Henri Outai"
    )


async def test_the_profile_edit_cannot_change_an_email(client):
    """Not an oversight — an identity change needs the new address verified
    before it becomes the login, and verification needs email transport the
    product does not have (B1). Accepting it here would let someone lock
    themselves out with a typo."""
    headers = bearer(await signup(client))
    before = (await client.get("/users/me", headers=headers)).json()["email"]

    response = await client.patch(
        "/users/me",
        headers=headers,
        json={"display_name": "Still Me", "email": "someone.else@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == before


async def test_the_interface_language_starts_unchosen(client):
    """Null is meaningful. It means "follow the company", not "prefers French" —
    and a stored default would make those two indistinguishable."""
    headers = bearer(await signup(client))
    assert (await client.get("/users/me", headers=headers)).json()["language"] is None


async def test_setting_a_language_leaves_the_name_alone(client):
    """The toggle sends only `language`. A PATCH that required both fields would
    make changing language overwrite a display name it never saw."""
    headers = bearer(await signup(client))
    await client.patch("/users/me", headers=headers, json={"display_name": "Henri"})

    response = await client.patch("/users/me", headers=headers, json={"language": "nl"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["language"] == "nl"
    assert body["display_name"] == "Henri"


async def test_an_unsupported_language_is_refused(client):
    """Four languages have translations. A fifth would render as blank strings
    everywhere, which looks like a broken app rather than a missing locale."""
    headers = bearer(await signup(client))
    response = await client.patch("/users/me", headers=headers, json={"language": "de"})
    assert response.status_code == 422
