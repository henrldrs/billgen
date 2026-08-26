"""Commercial enforcement: quotas, feature gates, and the 402 contract.

The rules being pinned here, in the order they matter:

1. A quota refuses **creation** and nothing else. Existing records stay
   readable, editable, exportable and correctable forever.
2. 402 means commercially unavailable; 403 stays reserved for authenticated-but-
   unauthorized. The two must never blur.
3. The frontend is not the enforcement point — hiding a button is UX, and the
   server refuses regardless.
"""

from decimal import Decimal

import pytest
from sqlalchemy import update

from db.models import OrganizationRow

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    invoice_payload,
    signup,
)


def set_tier(client, tier: str) -> None:
    """Move the signed-up org onto a tier.

    Writes the row directly because there is no upgrade endpoint yet — checkout
    is the deliberately-deferred half of B4. `resolve_tier` reads
    `Organization.plan_tier` when no active `SubscriptionRow` exists, which is
    exactly this situation.
    """
    engine = client._transport.app.state.session_factory.kw["bind"]  # noqa: SLF001
    with engine.begin() as conn:
        conn.execute(update(OrganizationRow).values(plan_tier=tier))


async def free_org(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


# ── GET /entitlements + /plans ─────────────────────────────────────────────


async def test_entitlements_reports_tier_features_and_usage(client):
    headers, company, record = await free_org(client)
    await create_draft(client, headers, company["id"], record["id"])

    response = await client.get("/entitlements", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["tier"] == "free"
    assert body["features"]["pdf_remove_branding"] is False
    # Correcting an invoice and owning your data are on every tier by design.
    assert body["features"]["credit_notes"] is True
    assert body["features"]["backup_export"] is True
    assert body["features"]["backup_restore"] is True
    assert body["features"]["peppol_export"] is True

    usage = {item["meter"]: item for item in body["usage"]}
    assert usage["invoices"]["used"] == 1
    assert usage["invoices"]["limit"] == 10
    assert usage["invoices"]["remaining"] == 9
    assert usage["invoices"]["period"] is not None  # monthly meter
    assert usage["clients"]["used"] == 1
    assert usage["clients"]["period"] is None  # standing total, not per month
    assert usage["companies"]["used"] == 1
    assert usage["companies"]["limit"] == 1


async def test_plans_publishes_the_whole_matrix(client):
    alice = await signup(client)
    response = await client.get("/plans", headers=bearer(alice))
    assert response.status_code == 200, response.text

    tiers = {t["tier"]: t for t in response.json()["tiers"]}
    assert list(tiers) == ["free", "starter", "business", "business_pro"]

    quotas = {q["meter"]: q["limit"] for q in tiers["business_pro"]["quotas"]}
    assert quotas["invoices"] == 1000
    assert quotas["clients"] is None  # unlimited
    assert quotas["companies"] == 10
    assert tiers["business"]["features"]["multi_company"] is True
    assert tiers["starter"]["features"]["multi_company"] is False


# ── quotas refuse creation ─────────────────────────────────────────────────


async def test_company_quota_blocks_the_second_company_on_free(client):
    alice = await signup(client)
    headers = bearer(alice)
    await create_company(client, headers)

    response = await client.post(
        "/companies", json={"name": "Second SPRL"}, headers=headers
    )
    assert response.status_code == 402, response.text
    body = response.json()
    assert body["error"] == "usage_limit_reached"
    assert body["feature"] == "companies"
    assert body["limit"] == 1
    assert body["used"] == 1
    # The upgrade modal needs to name the right plan: Business is the cheapest
    # tier that admits a second company (Starter is also capped at 1).
    assert body["required_tier"] == "business"


async def test_client_quota_blocks_the_eleventh_client_on_free(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)

    for index in range(10):
        await create_client_record(client, headers, company["id"], name=f"Corp {index}")

    response = await client.post(
        "/clients",
        json={"company_id": company["id"], "name": "One Too Many"},
        headers=headers,
    )
    assert response.status_code == 402
    assert response.json()["feature"] == "clients"
    assert response.json()["required_tier"] == "starter"


async def test_invoice_quota_is_monthly_and_counts_drafts(client):
    headers, company, record = await free_org(client)
    for _ in range(10):
        await create_draft(client, headers, company["id"], record["id"])

    response = await client.post(
        "/invoices", json=invoice_payload(company["id"], record["id"]), headers=headers
    )
    assert response.status_code == 402
    body = response.json()
    assert body["feature"] == "invoices"
    assert body["period"] is not None
    assert "per month" in body["message"]


# ── quotas never touch existing data ───────────────────────────────────────


async def test_hitting_the_invoice_cap_never_blocks_existing_work(client):
    """The rule that matters most: a customer's own business records are never
    put behind a paywall. At the cap they can still issue, pay, correct, export
    and back up everything they already have."""
    headers, company, record = await free_org(client)
    drafts = [
        await create_draft(client, headers, company["id"], record["id"])
        for _ in range(10)
    ]
    # Confirm we really are at the cap.
    blocked = await client.post(
        "/invoices", json=invoice_payload(company["id"], record["id"]), headers=headers
    )
    assert blocked.status_code == 402

    # Issuing an existing draft is the legally load-bearing act — never refused.
    issued = await client.post(f"/invoices/{drafts[0]['id']}/issue", json={}, headers=headers)
    assert issued.status_code == 200, issued.text
    assert issued.json()["reference"] is not None

    paid = await client.post(
        "/payments",
        json={
            "invoice_id": issued.json()["id"],
            "amount": str(Decimal(issued.json()["total_ttc"])),
            "paid_on": "2026-08-01",
        },
        headers=headers,
    )
    assert paid.status_code == 201, paid.text

    note = await client.post(
        "/credit-notes",
        json={"invoice_id": issued.json()["id"], "reason": "correction"},
        headers=headers,
    )
    assert note.status_code == 201, note.text

    assert (await client.get("/invoices", headers=headers)).status_code == 200
    assert (await client.get("/backup/export", headers=headers)).status_code == 200
    assert (
        await client.get(f"/invoices/{issued.json()['id']}/html", headers=headers)
    ).status_code == 200


async def test_downgrade_over_limit_keeps_every_record(client):
    """Business → Starter with three companies. Nothing is deleted or hidden;
    only creating a fourth is refused."""
    alice = await signup(client)
    headers = bearer(alice)
    set_tier(client, "business")
    for index in range(3):
        await create_company(client, headers, name=f"Co {index}")

    set_tier(client, "starter")

    listed = await client.get("/companies", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 3  # all three survive the downgrade

    first = listed.json()[0]
    edited = await client.patch(
        f"/companies/{first['id']}", json={"city": "Gent"}, headers=headers
    )
    assert edited.status_code == 200, edited.text  # still fully editable

    blocked = await client.post("/companies", json={"name": "Fourth"}, headers=headers)
    assert blocked.status_code == 402
    assert blocked.json()["used"] == 3
    assert blocked.json()["limit"] == 1


# ── tier changes what is allowed ───────────────────────────────────────────


async def test_a_paid_tier_lifts_the_cap(client):
    alice = await signup(client)
    headers = bearer(alice)
    await create_company(client, headers)
    set_tier(client, "business")

    second = await client.post("/companies", json={"name": "Second SPRL"}, headers=headers)
    assert second.status_code == 201, second.text


@pytest.mark.parametrize(
    ("tier", "expect_footer"),
    [("free", True), ("starter", False), ("business", False), ("business_pro", False)],
)
async def test_pdf_branding_follows_the_tier(client, tier, expect_footer):
    """The Free → Starter conversion lever. A free account still produces a
    complete, valid invoice — only the footer differs."""
    headers, company, record = await free_org(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    set_tier(client, tier)

    html = await client.get(f"/invoices/{invoice['id']}/html", headers=headers)
    assert html.status_code == 200, html.text
    assert ('<div class="brand-footer">' in html.text) is expect_footer


async def test_peppol_allowance_counts_documents_not_downloads(client):
    """Peppol is on every tier — the Belgian differentiator, not an upsell —
    but the monthly allowance applies. It counts *distinct invoices*: exporting
    the same invoice again is free, because it is a document the customer has
    already paid for. Losing a download must never cost money."""
    headers, company, record = await free_org(client)
    invoices = [
        await create_invoice(client, headers, company["id"], record["id"])
        for _ in range(6)
    ]

    for invoice in invoices[:5]:
        ok = await client.get(f"/invoices/{invoice['id']}/peppol.xml", headers=headers)
        assert ok.status_code == 200, ok.text

    usage = {
        item["meter"]: item
        for item in (await client.get("/entitlements", headers=headers)).json()["usage"]
    }
    assert usage["peppol_documents"]["used"] == 5
    assert usage["peppol_documents"]["remaining"] == 0

    # A sixth *invoice* is refused...
    blocked = await client.get(f"/invoices/{invoices[5]['id']}/peppol.xml", headers=headers)
    assert blocked.status_code == 402
    assert blocked.json()["feature"] == "peppol_documents"
    assert blocked.json()["limit"] == 5
    assert blocked.json()["required_tier"] == "starter"

    # ...while re-downloading any of the five still works, and does not move
    # the meter.
    for invoice in invoices[:5]:
        again = await client.get(f"/invoices/{invoice['id']}/peppol.xml", headers=headers)
        assert again.status_code == 200, again.text

    after = {
        item["meter"]: item
        for item in (await client.get("/entitlements", headers=headers)).json()["usage"]
    }
    assert after["peppol_documents"]["used"] == 5


# ── the 402 contract ───────────────────────────────────────────────────────


async def test_402_body_is_uniform_enough_for_one_frontend_handler(client):
    alice = await signup(client)
    headers = bearer(alice)
    await create_company(client, headers)

    body = (
        await client.post("/companies", json={"name": "Second"}, headers=headers)
    ).json()
    for key in ("error", "required_tier", "feature", "message"):
        assert key in body, key


async def test_unauthenticated_calls_are_401_not_402(client):
    """402 is for a known tenant whose plan falls short. No token is still 401 —
    the two failure modes must not blur."""
    response = await client.post("/companies", json={"name": "Anon"})
    assert response.status_code == 401
