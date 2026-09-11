"""The guided first run's ledger (T-29, backend half).

T-29's assertions that do not need a screen: the wizard cannot be completed
with a company that fails validation; an accepted text is a `Document` of kind
`contract` in the data folder and therefore in the backup; the first run
completes once and reads back as completed; the data directory shown is the
one `app_data_dir()` actually resolved, asserted rather than hard-coded.

The legal registry ships every text undrafted, so the acceptance step is
empty by default and a test that needs a text drafts one — a version, a body —
into the registry for its own duration. That is the honest shape: the
mechanism is real, the texts are Henri's.
"""

from datetime import date

import pytest

from core.trust import legal

from .conftest import bearer, create_client_record, create_company, signup

pytestmark = pytest.mark.asyncio

TERMS_BODY = """# Terms of Service

These are the terms.

## Fees

You pay what the price page says.
"""


@pytest.fixture()
def drafted_terms(monkeypatch):
    """The registry with `terms` drafted, versioned and given a body — the
    state it will be in once Henri supplies the text. Everything else stays
    undrafted, so the required list is exactly one entry."""
    drafted = tuple(
        doc.model_copy(
            update={"drafted": True, "version": "1.0", "effective_date": date(2026, 9, 11),
                    "body": TERMS_BODY}
        )
        if doc.key == "terms"
        else doc
        for doc in legal.DOCUMENTS
    )
    monkeypatch.setattr(legal, "DOCUMENTS", drafted)
    monkeypatch.setattr(legal, "_BY_KEY", {doc.key: doc for doc in drafted})
    return drafted


async def test_with_nothing_drafted_the_acceptance_step_is_empty_and_says_so(client):
    headers = bearer(await signup(client))
    status = (await client.get("/onboarding", headers=headers)).json()
    assert status["required_texts"] == []
    assert status["completed_at"] is None
    assert status["company_id"] is None
    assert status["can_complete"] is False
    assert status["blockers"] == ["no company"]


async def test_completion_is_refused_while_the_company_fails_validation(client):
    headers = bearer(await signup(client))
    #  A VAT number with the right shape and the wrong checksum.
    company = await create_company(client, headers, vat_number="BE0123456788")

    status = (await client.get("/onboarding", headers=headers)).json()
    assert status["company_id"] == company["id"]
    assert status["company_valid"] is False
    assert "vat_number" in status["company_problems"]
    assert any(b.startswith("company:") for b in status["blockers"])

    refused = await client.post("/onboarding/complete", headers=headers)
    assert refused.status_code == 409
    assert "vat_number" in refused.json()["detail"]
    assert (await client.get("/onboarding", headers=headers)).json()["completed_at"] is None


async def test_completion_is_refused_until_every_required_text_is_accepted(client, drafted_terms):
    headers = bearer(await signup(client))
    await create_company(client, headers)

    status = (await client.get("/onboarding", headers=headers)).json()
    assert status["company_valid"] is True
    assert status["required_texts"] == [
        {"key": "terms", "title": "Terms of Service", "version": "1.0", "accepted": False}
    ]
    assert status["blockers"] == ["accept: terms"]

    refused = await client.post("/onboarding/complete", headers=headers)
    assert refused.status_code == 409
    assert "accept: terms" in refused.json()["detail"]


async def test_an_accepted_text_is_a_contract_document_in_the_data_folder(
    archiving_client, drafted_terms
):
    client, root = archiving_client
    auth = await signup(client)
    headers = bearer(auth)
    await create_company(client, headers)

    accepted = await client.post(
        "/onboarding/acceptances", json={"key": "terms"}, headers=headers
    )
    assert accepted.status_code == 201, accepted.text
    body = accepted.json()
    assert body["document_key"] == "terms"
    assert body["version"] == "1.0"
    assert body["document_id"] is not None

    #  The text she accepted, on disk where her invoices are, and registered
    #  as a contract — which is what puts it in the backup (T-27, T-28).
    files = sorted(p.relative_to(root).as_posix() for p in root.rglob("*.pdf"))
    assert len(files) == 1
    assert files[0].startswith("contracts/terms-v1.0-")
    listed = (await client.get("/documents", headers=headers)).json()["documents"]
    assert [d["kind"] for d in listed] == ["contract"]
    assert listed[0]["id"] == body["document_id"]
    exported = (await client.get("/backup/export", headers=headers)).json()
    assert [d["kind"] for d in exported["documents"]] == ["contract"]

    #  Accepting the same version twice is one fact, not two.
    again = await client.post("/onboarding/acceptances", json={"key": "terms"}, headers=headers)
    assert again.status_code == 201
    assert again.json()["id"] == body["id"]
    assert len(list(root.rglob("*.pdf"))) == 1


async def test_an_undrafted_text_cannot_be_accepted(client):
    headers = bearer(await signup(client))
    refused = await client.post("/onboarding/acceptances", json={"key": "terms"}, headers=headers)
    assert refused.status_code == 409
    assert "undrafted" in refused.json()["detail"]
    missing = await client.post("/onboarding/acceptances", json={"key": "nope"}, headers=headers)
    assert missing.status_code == 404


async def test_the_first_run_completes_once_and_shows_where_the_data_lives(
    archiving_client, drafted_terms
):
    client, root = archiving_client
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    await create_client_record(client, headers, company["id"])
    await client.post("/onboarding/acceptances", json={"key": "terms"}, headers=headers)

    before = (await client.get("/onboarding", headers=headers)).json()
    assert before["can_complete"] is True
    assert before["clients"] == 1
    #  Asserted against what the archive resolved, never a literal path.
    assert before["data_directory"] == str(root)
    assert before["documents_enabled"] is True

    done = await client.post("/onboarding/complete", headers=headers)
    assert done.status_code == 200, done.text
    assert done.json()["completed_at"] is not None

    #  Shown once: the stamp survives the call that reads it, and a second
    #  completion is a no-op rather than a second stamp.
    again = await client.post("/onboarding/complete", headers=headers)
    assert again.json()["completed_at"] == done.json()["completed_at"]
    assert (await client.get("/onboarding", headers=headers)).json()["completed_at"] == (
        done.json()["completed_at"]
    )


async def test_a_viewer_can_accept_but_not_complete(client, drafted_terms):
    """Accepting is her own act on her own identity; completing reshapes the
    organization."""
    from .test_authz import as_role  # noqa: PLC0415

    owner = bearer(await signup(client))
    await create_company(client, owner)
    viewer = bearer(await as_role(client, "viewer"))

    accepted = await client.post("/onboarding/acceptances", json={"key": "terms"}, headers=viewer)
    assert accepted.status_code == 201

    refused = await client.post("/onboarding/complete", headers=viewer)
    assert refused.status_code == 403
