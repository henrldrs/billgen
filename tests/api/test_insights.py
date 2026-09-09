"""The read-only aggregations the screens need: cross-invoice payments, the
invoice report, Client 360's stats and timeline, company identifier validation,
and invoice duplication.

Every one of these existed only as "fetch everything and do it in the browser".
"""

from datetime import date
from decimal import Decimal

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    signup,
)


async def _org_with_company(client, **company_overrides):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers, **company_overrides)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


# ── GET /payments ──────────────────────────────────────────────────────────


async def test_payments_list_across_invoices(client):
    """`invoice_id` used to be required, so a payments report was impossible."""
    headers, company, record = await _org_with_company(client)
    first = await create_invoice(client, headers, company["id"], record["id"])
    second = await create_invoice(client, headers, company["id"], record["id"])

    for invoice, amount, paid_on in (
        (first, "500.00", "2026-07-10"),
        (first, "1012.50", "2026-08-02"),
        (second, "1512.50", "2026-09-01"),
    ):
        response = await client.post(
            "/payments",
            json={"invoice_id": invoice["id"], "amount": amount, "paid_on": paid_on},
            headers=headers,
        )
        assert response.status_code == 201, response.text

    everything = await client.get(
        "/payments", params={"company_id": company["id"]}, headers=headers
    )
    assert everything.status_code == 200, everything.text
    payments = everything.json()
    assert len(payments) == 3
    assert [p["paid_on"] for p in payments] == ["2026-09-01", "2026-08-02", "2026-07-10"]

    by_client = await client.get(
        "/payments", params={"client_id": record["id"]}, headers=headers
    )
    assert len(by_client.json()) == 3

    by_invoice = await client.get(
        "/payments", params={"invoice_id": first["id"]}, headers=headers
    )
    assert {p["invoice_id"] for p in by_invoice.json()} == {first["id"]}

    # The date bounds are inclusive on both ends.
    windowed = await client.get(
        "/payments",
        params={
            "company_id": company["id"],
            "paid_from": "2026-08-02",
            "paid_to": "2026-09-01",
        },
        headers=headers,
    )
    assert [p["paid_on"] for p in windowed.json()] == ["2026-09-01", "2026-08-02"]


async def test_payments_list_is_tenant_isolated(client):
    headers, company, record = await _org_with_company(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "100.00", "paid_on": "2026-07-10"},
        headers=headers,
    )

    bob = await signup(client, email="bob@example.com", organization_name="Org B")
    theirs = await client.get("/payments", headers=bearer(bob))
    assert theirs.status_code == 200
    assert theirs.json() == []


# ── GET /reports/invoices ──────────────────────────────────────────────────


async def test_invoice_report_buckets_by_effective_status(client):
    headers, company, record = await _org_with_company(client)

    paid = await create_invoice(client, headers, company["id"], record["id"])
    await client.post(
        "/payments",
        json={"invoice_id": paid["id"], "amount": "1512.50", "paid_on": "2026-08-01"},
        headers=headers,
    )
    await create_invoice(client, headers, company["id"], record["id"])  # overdue by Aug 15
    await create_draft(client, headers, company["id"], record["id"])

    response = await client.get(
        "/reports/invoices",
        params={"company_id": company["id"], "today": "2026-08-15"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()

    buckets = {b["status"]: b for b in body["statuses"]}
    assert buckets["paid"]["count"] == 1
    assert buckets["overdue"]["count"] == 1
    assert buckets["draft"]["count"] == 1
    # A draft is counted but never carries money: it has no VAT force yet.
    assert Decimal(str(buckets["draft"]["total_ttc"])) == Decimal("0")

    assert body["invoice_count"] == 3
    assert body["draft_count"] == 1
    assert Decimal(str(body["invoiced_total"])) == Decimal("3025.00")
    assert Decimal(str(body["paid_total"])) == Decimal("1512.50")
    assert Decimal(str(body["outstanding_total"])) == Decimal("1512.50")
    assert body["overdue_count"] == 1
    assert Decimal(str(body["overdue_total"])) == Decimal("1512.50")
    assert Decimal(str(body["by_month"]["2026-07"])) == Decimal("3025.00")
    assert body["count_by_month"]["2026-07"] == 2
    assert body["period"] is None


async def test_invoice_report_restricts_to_a_period(client):
    headers, company, record = await _org_with_company(client)
    await create_invoice(client, headers, company["id"], record["id"])  # July
    await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-11-03"
    )

    q3 = await client.get(
        "/reports/invoices",
        params={"company_id": company["id"], "period": "2026-Q3"},
        headers=headers,
    )
    assert q3.json()["invoice_count"] == 1
    assert q3.json()["period"] == "2026-Q3"

    bad = await client.get(
        "/reports/invoices",
        params={"company_id": company["id"], "period": "last quarter"},
        headers=headers,
    )
    assert bad.status_code == 422


# ── GET /clients/{id}/stats ────────────────────────────────────────────────


async def test_client_stats(client):
    headers, company, record = await _org_with_company(client)
    other = await create_client_record(client, headers, company["id"], name="Other Corp")

    settled = await create_invoice(client, headers, company["id"], record["id"])
    await client.post(
        "/payments",
        json={"invoice_id": settled["id"], "amount": "1512.50", "paid_on": "2026-07-24"},
        headers=headers,
    )
    await create_invoice(client, headers, company["id"], record["id"])  # unpaid
    await create_draft(client, headers, company["id"], record["id"])
    # Another client's invoice must not leak into these numbers.
    await create_invoice(client, headers, company["id"], other["id"])

    response = await client.get(
        f"/clients/{record['id']}/stats", params={"today": "2026-08-15"}, headers=headers
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["client_id"] == record["id"]
    assert body["invoice_count"] == 3  # the draft is counted, not summed
    assert body["draft_count"] == 1
    assert Decimal(str(body["invoiced_total"])) == Decimal("3025.00")
    assert Decimal(str(body["paid_total"])) == Decimal("1512.50")
    assert Decimal(str(body["outstanding_total"])) == Decimal("1512.50")
    assert body["overdue_count"] == 1
    assert body["first_invoice_date"] == "2026-07-04"
    # 2026-07-04 issued, settled 2026-07-24.
    assert body["average_days_to_payment"] == 20


async def test_client_stats_counts_credit_notes(client):
    headers, company, record = await _org_with_company(client)
    cancelled = await create_invoice(client, headers, company["id"], record["id"])
    note = await client.post(
        "/credit-notes",
        json={"invoice_id": cancelled["id"], "reason": "cancelled"},
        headers=headers,
    )
    assert note.status_code == 201, note.text

    body = (await client.get(f"/clients/{record['id']}/stats", headers=headers)).json()
    assert body["credit_note_count"] == 1
    assert Decimal(str(body["credited_total"])) == Decimal("1512.50")
    # The invoice is voided, so it is no longer owed.
    assert Decimal(str(body["invoiced_total"])) == Decimal("0")
    assert Decimal(str(body["outstanding_total"])) == Decimal("0")


async def test_client_stats_404s_for_an_unknown_client(client):
    headers, _company, _record = await _org_with_company(client)
    missing = "00000000-0000-0000-0000-000000000000"
    assert (await client.get(f"/clients/{missing}/stats", headers=headers)).status_code == 404


# ── GET /clients/{id}/timeline ─────────────────────────────────────────────


async def test_client_timeline_is_commercial_not_audit(client):
    headers, company, record = await _org_with_company(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "1512.50", "paid_on": "2026-08-02"},
        headers=headers,
    )
    cancelled = await create_invoice(client, headers, company["id"], record["id"])
    today = date.today()
    await client.post(
        "/credit-notes",
        json={
            "invoice_id": cancelled["id"],
            "reason": "cancelled",
            "issue_date": today.isoformat(),
        },
        headers=headers,
    )

    response = await client.get(f"/clients/{record['id']}/timeline", headers=headers)
    assert response.status_code == 200, response.text
    events = response.json()

    # Newest first, and the same-day tie-break puts the credit note above the
    # void it causes - both are dated by the note, never by the wall clock.
    kinds = [e["kind"] for e in events]
    assert kinds[:2] == ["credit_note_issued", "invoice_voided"]
    assert [e["at"] for e in events[:2]] == [today.isoformat()] * 2
    assert "payment_received" in kinds
    assert kinds.count("invoice_issued") == 2

    payment = next(e for e in events if e["kind"] == "payment_received")
    assert Decimal(str(payment["amount"])) == Decimal("1512.50")
    assert payment["invoice_id"] == invoice["id"]

    # This is what /activity?target_id can never answer: the audit entries for
    # an invoice carry no client id.
    audit = await client.get(
        "/activity", params={"target_id": record["id"]}, headers=headers
    )
    assert {e["target_type"] for e in audit.json()} == {"client"}


async def test_client_timeline_respects_limit(client):
    headers, company, record = await _org_with_company(client)
    for _ in range(3):
        await create_invoice(client, headers, company["id"], record["id"])

    limited = await client.get(
        f"/clients/{record['id']}/timeline", params={"limit": 2}, headers=headers
    )
    assert len(limited.json()) == 2

    assert (
        await client.get(
            f"/clients/{record['id']}/timeline", params={"limit": 0}, headers=headers
        )
    ).status_code == 422


# ── GET /companies/{id}/validation ─────────────────────────────────────────


async def test_company_validation_passes_a_complete_company(client):
    headers, company, _record = await _org_with_company(client)

    response = await client.get(f"/companies/{company['id']}/validation", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["valid"] is True
    assert body["peppol_ready"] is True
    assert body["missing_for_peppol"] == []
    vat = next(c for c in body["checks"] if c["field"] == "vat_number")
    assert vat["valid"] is True
    assert vat["normalized"] == "BE0123456749"


async def test_company_validation_catches_a_vat_typo(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers, vat_number="BE0123456748")

    body = (
        await client.get(f"/companies/{company['id']}/validation", headers=headers)
    ).json()
    assert body["valid"] is False
    assert body["peppol_ready"] is False
    vat = next(c for c in body["checks"] if c["field"] == "vat_number")
    assert vat["valid"] is False
    assert vat["message_key"] == "errSupplierVat"


async def test_company_validation_reports_what_peppol_still_needs(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(
        client, headers, vat_number=None, iban=None, bic=None, address_line1=None
    )

    body = (
        await client.get(f"/companies/{company['id']}/validation", headers=headers)
    ).json()
    # Nothing is *wrong* — the fields are simply empty, which is not an error.
    assert body["valid"] is True
    assert body["peppol_ready"] is False
    assert set(body["missing_for_peppol"]) == {"address_line1", "vat_number", "iban"}


# ── POST /invoices/{id}/duplicate ──────────────────────────────────────────


async def test_duplicate_creates_an_unnumbered_draft(client):
    headers, company, record = await _org_with_company(client)
    source = await create_invoice(client, headers, company["id"], record["id"])
    assert source["reference"] is not None

    response = await client.post(f"/invoices/{source['id']}/duplicate", headers=headers)
    assert response.status_code == 201, response.text
    copy = response.json()

    assert copy["id"] != source["id"]
    assert copy["status"] == "draft"
    assert copy["reference"] is None
    assert copy["sequence_global"] is None
    assert copy["client_id"] == source["client_id"]
    assert [line["description"] for line in copy["lines"]] == [
        line["description"] for line in source["lines"]
    ]
    assert Decimal(str(copy["total_ttc"])) == Decimal(str(source["total_ttc"]))

    # The source is untouched.
    again = await client.get(f"/invoices/{source['id']}", headers=headers)
    assert again.json()["reference"] == source["reference"]
    assert again.json()["status"] == source["status"]


async def test_duplicate_of_a_voided_invoice_is_a_clean_draft(client):
    """Re-billing after a cancellation is the common case, so the copy must not
    inherit the void."""
    headers, company, record = await _org_with_company(client)
    source = await create_invoice(client, headers, company["id"], record["id"])
    await client.post(
        f"/invoices/{source['id']}/void", json={"reason": "wrong client"}, headers=headers
    )

    copy = (await client.post(f"/invoices/{source['id']}/duplicate", headers=headers)).json()
    assert copy["status"] == "draft"
    assert copy["voided_at"] is None
    assert copy["voided_reason"] is None


async def test_duplicate_404s_for_an_unknown_invoice(client):
    headers, _company, _record = await _org_with_company(client)
    missing = "00000000-0000-0000-0000-000000000000"
    response = await client.post(f"/invoices/{missing}/duplicate", headers=headers)
    assert response.status_code == 404
