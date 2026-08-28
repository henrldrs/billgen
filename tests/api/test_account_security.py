"""Sessions, password change, team roles and numbering counters.

Four settings cards' worth of backend that needed no external decision — the
data was already there and only the HTTP surface was missing. The tests below
concentrate on the parts where getting it wrong is quiet: a session list that
shows revoked tokens, a password change that leaves old sessions alive, a role
endpoint that lets the last owner strand the organization.
"""

from uuid import uuid4

import pytest

from .conftest import bearer, create_company, signup


@pytest.fixture()
async def account(client):
    payload = await signup(client)
    return client, bearer(payload), payload


# -- sessions --------------------------------------------------------------


async def test_the_session_list_shows_only_live_sign_ins(account):
    """Refresh tokens rotate, so every refresh revokes one and issues another.

    Listing the whole table would show one row per refresh the browser has ever
    performed, which reads as a security incident rather than a session list.
    """
    client, headers, payload = account

    first = await client.get("/users/me/sessions", headers=headers)
    assert first.status_code == 200, first.text
    assert len(first.json()) == 1

    # A refresh rotates: the old token is revoked, a new one issued.
    refreshed = await client.post(
        "/auth/refresh", json={"refresh_token": payload["tokens"]["refresh_token"]}
    )
    assert refreshed.status_code == 200

    after = await client.get("/users/me/sessions", headers=headers)
    assert len(after.json()) == 1, "rotation must not accumulate rows in the list"


async def test_a_session_carries_no_device_or_location(account):
    """audit_log has columns for IP and user agent and nothing writes them, so
    a "Chrome on Windows, Brussels" line would be invented rather than reported.
    The privacy inventory says that data is not collected; this keeps it true."""
    client, headers, _ = account
    session = (await client.get("/users/me/sessions", headers=headers)).json()[0]
    assert set(session) == {"jti", "created_at", "expires_at", "current"}


async def test_you_cannot_revoke_someone_elses_session(client):
    alice = await signup(client)
    bob = await signup(client, email="bob@example.com", organization_name="Bob BV")

    alice_session = (
        await client.get("/users/me/sessions", headers=bearer(alice))
    ).json()[0]

    #  404 rather than 403: Bob has no business learning the id exists.
    response = await client.delete(
        f"/users/me/sessions/{alice_session['jti']}", headers=bearer(bob)
    )
    assert response.status_code == 404

    still_there = await client.get("/users/me/sessions", headers=bearer(alice))
    assert len(still_there.json()) == 1


async def test_revoking_a_session_removes_it_from_the_list(account):
    client, headers, _ = account
    session = (await client.get("/users/me/sessions", headers=headers)).json()[0]

    gone = await client.delete(f"/users/me/sessions/{session['jti']}", headers=headers)
    assert gone.status_code == 204
    assert (await client.get("/users/me/sessions", headers=headers)).json() == []

    # Revoking twice is a 404, not a second success.
    assert (
        await client.delete(f"/users/me/sessions/{session['jti']}", headers=headers)
    ).status_code == 404


# -- password --------------------------------------------------------------


async def test_changing_a_password_requires_the_current_one(account):
    client, headers, _ = account
    response = await client.post(
        "/users/me/password",
        headers=headers,
        json={"current_password": "not-the-password", "new_password": "a-new-long-one"},
    )
    #  401: the request was well-formed and the credential was wrong, which is
    #  an authentication failure rather than a bad field.
    assert response.status_code == 401, response.text


async def test_a_password_change_closes_every_other_session(account):
    """The point of the feature as much as the new password is.

    Someone changing a password because they believe it was seen needs the
    sessions it opened closed. Leaving them alive makes the change cosmetic.
    """
    client, headers, payload = account

    response = await client.post(
        "/users/me/password",
        headers=headers,
        json={
            "current_password": "s3cret-pass",
            "new_password": "a-much-longer-secret",
        },
    )
    assert response.status_code == 204, response.text

    # The old refresh token no longer works.
    stale = await client.post(
        "/auth/refresh", json={"refresh_token": payload["tokens"]["refresh_token"]}
    )
    assert stale.status_code == 401

    # And the new password is the one that logs in.
    assert (
        await client.post(
            "/auth/login",
            json={"email": "alice@example.com", "password": "a-much-longer-secret"},
        )
    ).status_code == 200


async def test_a_short_new_password_is_refused(account):
    """Same floor as signup. A change path that accepts a weaker password than
    registration is a downgrade attack with extra steps."""
    client, headers, _ = account
    response = await client.post(
        "/users/me/password",
        headers=headers,
        json={"current_password": "s3cret-pass", "new_password": "short"},
    )
    assert response.status_code == 422


# -- team ------------------------------------------------------------------


async def test_the_member_list_carries_the_role_each_person_holds(account):
    """The IA claimed OrgMembership "carries no role enum". It does, and has
    since the initial schema — this is the endpoint that was missing."""
    client, headers, payload = account
    response = await client.get("/orgs/current/members", headers=headers)
    assert response.status_code == 200, response.text

    members = response.json()
    assert len(members) == 1
    assert members[0]["user_id"] == payload["user_id"]
    assert members[0]["role"] == "owner"
    assert members[0]["email"] == "alice@example.com"


async def test_you_cannot_change_your_own_role(account):
    """The last owner demoting themselves leaves an organization nobody can
    administer, and the check that would allow it safely is one nobody
    remembers to write."""
    client, headers, payload = account
    response = await client.patch(
        f"/orgs/current/members/{payload['user_id']}",
        headers=headers,
        json={"role": "viewer"},
    )
    assert response.status_code == 409, response.text


async def test_a_stranger_is_not_a_member(account):
    client, headers, _ = account
    response = await client.patch(
        f"/orgs/current/members/{uuid4()}", headers=headers, json={"role": "admin"}
    )
    assert response.status_code == 404


async def test_members_are_scoped_to_the_organization(client):
    alice = await signup(client)
    await signup(client, email="bob@example.com", organization_name="Bob BV")

    listed = (await client.get("/orgs/current/members", headers=bearer(alice))).json()
    assert [m["email"] for m in listed] == ["alice@example.com"]


# -- numbering -------------------------------------------------------------


async def test_the_numbering_screen_can_read_every_series(account):
    """`sequence_repo.snapshot` has existed since ADR-0003 for backups; the IA
    said the counter was "not readable", which was true only of HTTP."""
    client, headers, _ = account
    company = await create_company(client, headers)

    response = await client.get(
        "/sequences", headers=headers, params={"company_id": company["id"]}
    )
    assert response.status_code == 200, response.text
    body = response.json()

    scopes = {s["scope"]: s for s in body["series"]}
    assert set(scopes) == {"invoice", "quote", "credit_note"}
    # An unused series reports zero rather than being omitted: the screen has to
    # show every series a company has, including the ones it has not started.
    assert all(s["current"] == 0 and s["next"] == 1 for s in scopes.values())


async def test_issuing_an_invoice_advances_the_counter_the_screen_reads(account):
    client, headers, _ = account
    company = await create_company(client, headers)

    from .conftest import create_client_record, create_invoice

    customer = await create_client_record(client, headers, company["id"])
    await create_invoice(client, headers, company["id"], customer["id"])

    body = (
        await client.get(
            "/sequences", headers=headers, params={"company_id": company["id"]}
        )
    ).json()
    invoice = next(s for s in body["series"] if s["scope"] == "invoice")

    assert invoice["current"] == 1
    assert invoice["next"] == 2
    # The quote series is untouched by an invoice — they are separate series on
    # purpose, so that a refused offer leaves no hole in the gapless one.
    quote = next(s for s in body["series"] if s["scope"] == "quote")
    assert quote["current"] == 0
