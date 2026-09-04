"""The trust surfaces over HTTP.

Two properties are worth more than the payload shapes below and are tested
first: `/trust/*` must answer without a token (a privacy policy behind a login
is not a privacy policy), and `/activity/security` must not (it reads one
organization's audit log).
"""

from .conftest import bearer, create_company, signup

# -- public by design ------------------------------------------------------


async def test_the_legal_register_answers_without_a_token(client):
    """The marketing site serves these from the same endpoint the app does, and
    a prospect reads the DPA before there is an account to authenticate."""
    response = await client.get("/trust/legal/documents")

    assert response.status_code == 200, response.text
    documents = response.json()
    assert len(documents) == 7
    assert {d["key"] for d in documents} >= {"terms", "privacy", "dpa", "notices"}


async def test_undrafted_documents_are_listed_rather_than_hidden(client):
    """Hiding them would make the endpoint agree with a footer and disagree
    with reality. The list of what is missing is the useful half today."""
    documents = (await client.get("/trust/legal/documents")).json()

    assert all(d["drafted"] is False for d in documents)
    assert all(d["version"] is None for d in documents)
    terms = next(d for d in documents if d["key"] == "terms")
    assert terms["requires_acceptance"] is True
    assert terms["blocks"]


async def test_an_unknown_document_key_is_a_404_not_an_empty_document(client):
    assert (await client.get("/trust/legal/documents/terms")).status_code == 200
    assert (await client.get("/trust/legal/documents/handshake")).status_code == 404


async def test_the_privacy_register_names_what_survives_a_deletion_request(client):
    """The list a deletion dialog is obliged to show: "delete everything" is
    false while seven years of invoices are legally frozen."""
    response = await client.get("/trust/privacy/register")

    assert response.status_code == 200, response.text
    body = response.json()
    assert {"invoices", "clients"} <= set(body["retained_on_erasure"])
    invoices = next(ds for ds in body["datasets"] if ds["key"] == "invoices")
    assert invoices["basis"] == "legal_obligation"
    assert invoices["erasure"] == "retain"


async def test_the_subprocessor_list_separates_live_from_planned(client):
    response = await client.get("/trust/subprocessors")

    assert response.status_code == 200, response.text
    rows = response.json()
    assert any(row["in_use"] for row in rows)
    assert any(not row["in_use"] for row in rows)


async def test_consent_categories_default_to_off_except_the_essential_one(client):
    response = await client.get("/trust/consent/categories")

    assert response.status_code == 200, response.text
    by_key = {row["category"]: row for row in response.json()}
    assert by_key["essential"]["essential"] is True
    assert by_key["essential"]["default_on"] is True
    assert by_key["analytics"]["default_on"] is False
    #  Nothing analytic runs, which is the only reason no banner ships yet.
    assert by_key["analytics"]["in_use"] == []


async def test_ai_transparency_reports_one_date_and_no_high_risk_surface(client):
    response = await client.get("/trust/ai-transparency")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["obligation_date"] == "2026-12-02"
    assert all(surface["risk"] != "high" for surface in body["surfaces"])
    assert all(surface["requires_marking"] for surface in body["surfaces"])


# -- not public ------------------------------------------------------------


async def test_security_events_need_a_token(client):
    """The mirror of the tests above: this one reads an organization's log."""
    assert (await client.get("/activity/security")).status_code == 401


async def test_the_security_view_reports_its_own_blind_spots(client):
    """An empty row in a security screen must never read as calm. The endpoint
    returns the actions nothing writes so the screen can name the blind spot —
    today, failed sign-ins, which is the line the log exists for.
    """
    payload = await signup(client)
    headers = bearer(payload)

    response = await client.get("/activity/security", headers=headers)

    assert response.status_code == 200, response.text
    assert set(response.json()["not_recorded"]) == {"error"}


async def test_revoking_a_session_does_not_break_the_activity_log(client):
    """Regression, found 2026-09-04 against a running server.

    The auth service writes `session.revoke` and `password.change` straight
    into the audit table as strings. Neither was in AuditAction, so reading the
    log back failed validation: one revocation made GET /activity return 422
    for that organization permanently — an append-only fiscal trail rendered
    unreadable by a security feature.
    """
    payload = await signup(client)
    headers = bearer(payload)

    sessions = await client.get("/users/me/sessions", headers=headers)
    jti = sessions.json()[0]["jti"]
    revoked = await client.delete(f"/users/me/sessions/{jti}", headers=headers)
    assert revoked.status_code == 204, revoked.text

    log = await client.get("/activity", headers=headers)
    assert log.status_code == 200, log.text
    assert "session.revoke" in {entry["action"] for entry in log.json()}


async def test_a_sign_in_and_a_revocation_reach_the_security_view(client):
    """The two ends of the session story, on the screen that exists for it."""
    payload = await signup(client)
    headers = bearer(payload)
    await client.post(
        "/auth/login", json={"email": "alice@example.com", "password": "s3cret-pass"}
    )

    sessions = await client.get("/users/me/sessions", headers=headers)
    await client.delete(f"/users/me/sessions/{sessions.json()[0]['jti']}", headers=headers)

    body = (await client.get("/activity/security", headers=headers)).json()

    actions = {event["entry"]["action"] for event in body["events"]}
    assert {"login", "session.revoke"} <= actions


async def test_a_backup_export_lands_on_the_security_view_and_a_company_does_not(client):
    """The filter is the whole feature: creating a company is business
    activity, exporting every invoice in the organization is exposure."""
    payload = await signup(client)
    headers = bearer(payload)
    await create_company(client, headers)

    export = await client.get("/backup/export", headers=headers)
    assert export.status_code == 200, export.text

    body = (await client.get("/activity/security", headers=headers)).json()

    exports = [e for e in body["events"] if e["entry"]["action"] == "export_backup"]
    assert len(exports) == 1
    assert exports[0]["kind"] == "data_export"
    assert exports[0]["severity"] == "notice"
    #  Creating the company is ordinary business activity and must not appear.
    assert "create" not in {event["entry"]["action"] for event in body["events"]}


async def test_the_full_activity_log_still_shows_what_the_security_view_filters_out(
    client,
):
    """A guard against the filter leaking upward into the ordinary log."""
    payload = await signup(client)
    headers = bearer(payload)
    await create_company(client, headers)

    entries = (await client.get("/activity", headers=headers)).json()

    assert any(entry["action"] == "create" for entry in entries)
