"""GET /invoices/{id}/compliance, and the 422 that POST /issue now returns.

The rules themselves are pinned in `tests/core/services/test_invoice_compliance.py`.
What is pinned here is the wire contract, because that is what the composer
consumes:

1. **The read is available before the write is attempted.** A person composing
   an invoice can see what is missing while it is still editable, instead of
   discovering it from a refused issue.
2. **A refused issue answers 422 with per-field errors**, in the same shape as
   the Peppol gate, plus the article each one rests on.
3. **The refusal leaves nothing behind** — still a draft, still no number.
"""

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    signup,
)


async def seeded(client, **client_overrides):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"], **client_overrides)
    return headers, company, record


async def test_a_complete_draft_reports_conforming_and_issuable(client):
    headers, company, record = await seeded(client)
    draft = await create_draft(client, headers, company["id"], record["id"])

    response = await client.get(f"/invoices/{draft['id']}/compliance", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["conforming"] is True
    assert body["issuable"] is True
    assert body["status"] == "draft"
    assert [f for f in body["findings"] if f["severity"] == "blocking"] == []


async def test_a_missing_client_vat_number_is_reported_before_the_issue(client):
    headers, company, record = await seeded(client, vat_number=None)
    draft = await create_draft(client, headers, company["id"], record["id"])

    body = (
        await client.get(f"/invoices/{draft['id']}/compliance", headers=headers)
    ).json()
    assert body["issuable"] is False
    blocking = [f for f in body["findings"] if f["severity"] == "blocking"]
    assert [f["field"] for f in blocking] == ["client.vat_number"]
    # The citation is the half that makes this a compliance product rather than
    # a form validator: the screen can say which article it is failing.
    assert blocking[0]["legal_basis"]


async def test_issue_refuses_with_422_and_the_offending_fields(client):
    headers, company, record = await seeded(client, vat_number=None)
    draft = await create_draft(client, headers, company["id"], record["id"])

    response = await client.post(f"/invoices/{draft['id']}/issue", json={}, headers=headers)
    assert response.status_code == 422, response.text
    body = response.json()
    assert body["detail"] == "Invoice is not legally complete"
    assert [e["field"] for e in body["errors"]] == ["client.vat_number"]

    # And nothing happened: still a draft, still no number. A refused issue that
    # consumed a number would leave a permanent hole in the gapless series.
    after = (await client.get(f"/invoices/{draft['id']}", headers=headers)).json()
    assert after["status"] == "draft"
    assert after["reference"] is None
    assert after["sequence_global"] is None


async def test_advisory_findings_do_not_refuse_the_issue(client):
    """No IBAN: nobody can pay it, it is still a valid invoice, and the endpoint
    says so on both sides of the issue."""
    headers = bearer(await signup(client))
    company = await create_company(client, headers, iban=None, bic=None)
    record = await create_client_record(client, headers, company["id"])
    issued = await create_invoice(client, headers, company["id"], record["id"])

    body = (
        await client.get(f"/invoices/{issued['id']}/compliance", headers=headers)
    ).json()
    assert body["conforming"] is True
    # Conforming, and no longer issuable — the two are different questions and
    # an issued invoice answers them differently.
    assert body["issuable"] is False
    assert "warnSupplierIbanMissing" in [f["message_key"] for f in body["findings"]]


async def test_a_reverse_charged_line_taxed_at_21_percent_is_refused(client):
    """The document would say the customer owes the tax and then charge them the
    tax. Both halves print, and a reader cannot tell which is the error."""
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    record = await create_client_record(
        client, headers, company["id"], country_code="NL", vat_number="NL123456789B01"
    )
    draft = await create_draft(
        client,
        headers,
        company["id"],
        record["id"],
        lines=[
            {
                "description": "Cross-border consulting",
                "quantity": "1",
                "unit_price": "1000.00",
                "vat": {"category": "AE", "rate": "21"},
            }
        ],
    )

    response = await client.post(f"/invoices/{draft['id']}/issue", json={}, headers=headers)
    assert response.status_code == 422, response.text
    assert [e["message_key"] for e in response.json()["errors"]] == ["errZeroRatedLineTaxed"]
