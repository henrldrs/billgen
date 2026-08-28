"""GET /alerts — the rules engine behind "what needs attention".

What is being pinned:

1. **Overdue means the same thing here as everywhere else.** Past due, not
   voided, not fully paid — and a partial payment leaves only the remainder.
2. **Severity is a rule, not a guess.** Thirty days past due is critical; the
   company's own identifiers being wrong is critical too, because it
   invalidates every invoice it issues rather than one of them.
3. **The counts describe everything that fired, the list is capped.** A badge
   that lies to match its page is worse than a badge above a shorter list.
4. **No prose crosses the wire.** A code and a context; the sentence is the
   frontend's, in the user's language.
"""

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    signup,
)

# create_company's fixture company is deliberately complete (valid VAT, IBAN,
# BIC), so company.incomplete stays quiet unless a test asks for it.


async def alerts(client, headers, company, **params) -> dict:
    response = await client.get(
        "/alerts", params={"company_id": company["id"], **params}, headers=headers
    )
    assert response.status_code == 200, response.text
    return response.json()


async def workspace(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


def of_code(body: dict, code: str) -> list[dict]:
    return [alert for alert in body["alerts"] if alert["code"] == code]


async def test_an_overdue_invoice_raises_one_alert(client):
    headers, company, record = await workspace(client)
    invoice = await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )

    body = await alerts(client, headers, company, today="2026-08-15")

    overdue = of_code(body, "invoice.overdue")
    assert len(overdue) == 1
    assert overdue[0]["target_id"] == invoice["id"]
    assert overdue[0]["target_type"] == "invoice"
    assert overdue[0]["context"]["outstanding"] == "1512.50"
    assert overdue[0]["context"]["days_overdue"] > 0


async def test_an_invoice_still_within_terms_is_quiet(client):
    headers, company, record = await workspace(client)
    await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )

    body = await alerts(client, headers, company, today="2026-07-10")

    assert of_code(body, "invoice.overdue") == []


async def test_a_partial_payment_leaves_only_the_remainder(client):
    """An invoice 90% settled is a different conversation from an unpaid one."""
    headers, company, record = await workspace(client)
    invoice = await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )
    await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "1000.00", "paid_on": "2026-08-01"},
        headers=headers,
    )

    body = await alerts(client, headers, company, today="2026-08-15")

    assert of_code(body, "invoice.overdue")[0]["context"]["outstanding"] == "512.50"


async def test_a_settled_invoice_raises_nothing(client):
    headers, company, record = await workspace(client)
    invoice = await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )
    await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "1512.50", "paid_on": "2026-08-01"},
        headers=headers,
    )

    body = await alerts(client, headers, company, today="2026-09-30")

    assert of_code(body, "invoice.overdue") == []


async def test_a_voided_invoice_is_not_chased(client):
    headers, company, record = await workspace(client)
    invoice = await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )
    await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "duplicate"}, headers=headers
    )

    body = await alerts(client, headers, company, today="2026-09-30")

    assert of_code(body, "invoice.overdue") == []


async def test_thirty_days_past_due_is_critical(client):
    headers, company, record = await workspace(client)
    await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )

    mildly = await alerts(client, headers, company, today="2026-08-10")
    assert of_code(mildly, "invoice.overdue")[0]["severity"] == "warning"

    badly = await alerts(client, headers, company, today="2026-10-10")
    assert of_code(badly, "invoice.overdue")[0]["severity"] == "critical"


async def test_a_forgotten_draft_is_flagged_but_only_as_information(client):
    headers, company, record = await workspace(client)
    await create_draft(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )

    fresh = await alerts(client, headers, company, today="2026-07-10")
    assert of_code(fresh, "invoice.draft_stale") == []

    stale = await alerts(client, headers, company, today="2026-09-01")
    assert len(of_code(stale, "invoice.draft_stale")) == 1
    assert of_code(stale, "invoice.draft_stale")[0]["severity"] == "info"
    # A draft is never overdue: it has no number and is not owed by anyone.
    assert of_code(stale, "invoice.overdue") == []


async def test_a_business_client_without_a_vat_number_is_flagged(client):
    """It cannot be sent over Peppol and cannot be reverse-charged — it is
    silently treated as a consumer, which is the expensive way to find out."""
    headers, company, _ = await workspace(client)
    missing = await create_client_record(
        client, headers, company["id"], name="No VAT NV", vat_number=None
    )
    await create_client_record(
        client, headers, company["id"], name="Consumer", vat_number=None, is_business=False
    )

    body = await alerts(client, headers, company, today="2026-08-15")

    flagged = of_code(body, "client.missing_vat_number")
    assert [alert["target_id"] for alert in flagged] == [missing["id"]]
    assert flagged[0]["severity"] == "warning"


async def test_an_incomplete_company_outranks_everything(client):
    headers = bearer(await signup(client))
    company = (
        await client.post("/companies", json={"name": "Bare Bones"}, headers=headers)
    ).json()

    body = await alerts(client, headers, company, today="2026-08-15")

    incomplete = of_code(body, "company.incomplete")
    assert len(incomplete) == 1
    assert incomplete[0]["target_id"] == company["id"]
    assert incomplete[0]["context"]["missing_for_peppol"]
    # Worst first: whatever else fired, this is at the top.
    assert body["alerts"][0]["code"] == "company.incomplete"


async def test_counts_cover_everything_even_when_the_list_is_capped(client):
    headers, company, record = await workspace(client)
    for _ in range(3):
        await create_invoice(
            client, headers, company["id"], record["id"], issue_date="2026-07-04"
        )

    body = await alerts(client, headers, company, today="2026-08-15", limit=1)

    assert len(body["alerts"]) == 1
    assert body["counts_by_code"]["invoice.overdue"] == 3
    assert body["counts_by_severity"]["warning"] == 3
    assert body["truncated"] is True


async def test_a_clean_company_has_nothing_to_say(client):
    headers, company, _ = await workspace(client)

    body = await alerts(client, headers, company, today="2026-08-15")

    assert body["alerts"] == []
    assert body["counts_by_code"] == {}
    assert body["truncated"] is False
    assert body["as_of"] == "2026-08-15"


async def test_alerts_require_authentication(client):
    assert (await client.get("/alerts?company_id=x")).status_code == 401


async def test_an_unknown_company_is_a_404(client):
    headers, _, _ = await workspace(client)

    response = await client.get(
        "/alerts",
        params={"company_id": "00000000-0000-0000-0000-000000000000"},
        headers=headers,
    )

    assert response.status_code == 404
