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


async def test_unknown_email_costs_the_same_as_a_wrong_password(client, monkeypatch):
    """SEC-19. The reply shape was always identical; the *timing* was not.

    `verify_password` used to run only when a user row was found, so an unknown
    address answered in about a millisecond and a known one took the full
    Argon2id verify — roughly a thousandfold difference, measurable from
    anywhere, turning login into a "is this person a customer" oracle.

    Asserted by observing the deliberate spend rather than by timing the call,
    because a wall-clock assertion on a shared CI runner is a flake generator.
    The measurement that justified the fix lives in the commit message.
    """
    from api.security import auth_service

    spent = []
    monkeypatch.setattr(auth_service, "waste_time", lambda: spent.append(1))

    assert (
        await client.post(
            "/auth/login",
            json={"email": "ghost@example.com", "password": "whatever-pass"},
        )
    ).status_code == 401
    assert spent == [1], "unknown address must still pay for a verification"

    #  And the real path must not pay twice: a found user verifies for real.
    spent.clear()
    await signup(client)
    assert (
        await client.post(
            "/auth/login",
            json={"email": "alice@example.com", "password": "wrong-password"},
        )
    ).status_code == 401
    assert spent == [], "a found user is verified for real, not with the dummy"


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
    second = await client.post("/auth/refresh", json={"refresh_token": new_tokens["refresh_token"]})
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


async def test_repeated_failed_logins_are_throttled_before_correct_ones(client):
    """SEC-20. The auth budget is separate from the browsing budget, and it is
    charged on failure only.

    A single global per-IP limit rated /auth/login exactly like scrolling a
    list — at 120/min that is 172,800 guesses a day from one address. The
    separate bucket is small; the important half of the assertion is the
    second one, that a *correct* sign-in never pays into it, because a limiter
    that counts successes locks customers out of their own accounts.
    """
    await signup(client)

    for _ in range(12):
        await client.post(
            "/auth/login",
            json={"email": "alice@example.com", "password": "wrong-password"},
        )

    blocked = await client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "correct-horse-battery"},
    )
    assert blocked.status_code == 429, "guessing must hit the auth bucket"


async def test_successful_logins_never_pay_into_the_auth_bucket(client):
    """The half of SEC-20 that protects the customer rather than the account.

    The auth bucket is small — ten a minute — so if correct sign-ins were
    charged to it, anyone with several devices or a flaky connection would
    throttle themselves out of a product they are paying for. Fifteen correct
    logins in a row must all succeed.
    """
    await signup(client)
    for attempt in range(15):
        response = await client.post(
            "/auth/login",
            json={"email": "alice@example.com", "password": "s3cret-pass"},
        )
        assert response.status_code == 200, f"a working password throttled on attempt {attempt + 1}"
