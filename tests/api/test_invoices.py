from decimal import Decimal
from xml.etree import ElementTree as ET

from core.einvoicing.ubl_builder import NS_CBC

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    invoice_payload,
    signup,
)


async def _setup(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


async def test_preview_returns_totals_without_burning_sequence(client):
    headers, company, record = await _setup(client)

    preview = await client.post(
        "/invoices/preview",
        json={
            "lines": invoice_payload(company["id"], record["id"])["lines"],
            "currency": "EUR",
        },
        headers=headers,
    )
    assert preview.status_code == 200
    body = preview.json()
    assert Decimal(str(body["total_ttc"])) == Decimal("1512.50")
    assert Decimal(str(body["vat_breakdown"]["21"])) == Decimal("262.50")

    invoice = await create_invoice(client, headers, company["id"], record["id"])
    assert invoice["sequence_global"] == 1  # preview did not consume a number


async def test_post_invoices_creates_a_draft(client):
    headers, company, record = await _setup(client)
    draft = await create_draft(client, headers, company["id"], record["id"])

    assert draft["status"] == "draft"
    assert draft["reference"] is None
    assert draft["sequence_global"] is None
    # Totals are still computed for display.
    assert Decimal(str(draft["total_ttc"])) == Decimal("1512.50")


async def test_issue_draft_assigns_number(client):
    headers, company, record = await _setup(client)
    draft = await create_draft(client, headers, company["id"], record["id"])

    issued = await client.post(
        f"/invoices/{draft['id']}/issue", json={}, headers=headers
    )
    assert issued.status_code == 200, issued.text
    body = issued.json()
    assert body["status"] == "issued"
    assert body["reference"] == "ACME-BC07012026"
    assert body["sequence_global"] == 1

    # Re-issuing an already-issued invoice is a business-rule conflict.
    again = await client.post(
        f"/invoices/{draft['id']}/issue", json={}, headers=headers
    )
    assert again.status_code == 409

    audit = await client.get(
        "/activity", params={"target_type": "invoice"}, headers=headers
    )
    actions = [entry["action"] for entry in audit.json()]
    assert "create" in actions and "issue" in actions


async def test_delete_draft_then_gone(client):
    headers, company, record = await _setup(client)
    draft = await create_draft(client, headers, company["id"], record["id"])

    deleted = await client.delete(f"/invoices/{draft['id']}", headers=headers)
    assert deleted.status_code == 204

    gone = await client.get(f"/invoices/{draft['id']}", headers=headers)
    assert gone.status_code == 404


async def test_delete_issued_invoice_conflict(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    response = await client.delete(f"/invoices/{invoice['id']}", headers=headers)
    assert response.status_code == 409
    # Still retrievable.
    still = await client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert still.status_code == 200


async def test_create_invoice_full_shape(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    assert invoice["reference"] == "ACME-BC07012026"
    assert invoice["status"] == "issued"
    assert Decimal(str(invoice["subtotal_ht"])) == Decimal("1250.00")
    assert Decimal(str(invoice["total_vat"])) == Decimal("262.50")
    assert Decimal(str(invoice["total_ttc"])) == Decimal("1512.50")
    assert invoice["due_date"] == "2026-08-03"
    assert len(invoice["lines"]) == 1
    assert invoice["lines"][0]["line_number"] == 1

    audit = await client.get(
        "/activity", params={"target_type": "invoice"}, headers=headers
    )
    actions = [entry["action"] for entry in audit.json()]
    assert "create" in actions


async def test_list_filter_by_status_and_get(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    issued = await client.get(
        "/invoices",
        params={"company_id": company["id"], "status": "issued"},
        headers=headers,
    )
    assert len(issued.json()) == 1

    voided = await client.get(
        "/invoices",
        params={"company_id": company["id"], "status": "voided"},
        headers=headers,
    )
    assert voided.json() == []

    fetched = await client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert fetched.json()["reference"] == invoice["reference"]


async def test_list_filter_by_client(client):
    """Client 360's invoice history. Without this filter the screen has to pull
    every invoice in the company and narrow it in the browser."""
    headers, company, record = await _setup(client)
    other = await create_client_record(client, headers, company["id"], name="Other Corp")

    mine = await create_invoice(client, headers, company["id"], record["id"])
    await create_invoice(client, headers, company["id"], other["id"])

    filtered = await client.get(
        "/invoices", params={"client_id": record["id"]}, headers=headers
    )
    assert filtered.status_code == 200
    assert [row["id"] for row in filtered.json()] == [mine["id"]]

    # Composable with the filters that were already there.
    with_status = await client.get(
        "/invoices",
        params={"client_id": record["id"], "status": "voided"},
        headers=headers,
    )
    assert with_status.json() == []

    unfiltered = await client.get("/invoices", headers=headers)
    assert len(unfiltered.json()) == 2


async def test_void_and_double_void(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    voided = await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "duplicate"}, headers=headers
    )
    assert voided.status_code == 200
    assert voided.json()["status"] == "voided"
    assert voided.json()["voided_reason"] == "duplicate"

    again = await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "again"}, headers=headers
    )
    assert again.status_code == 409


async def test_unknown_client_404(client):
    headers, company, _ = await _setup(client)
    response = await client.post(
        "/invoices",
        json=invoice_payload(company["id"], "00000000-0000-0000-0000-000000000000"),
        headers=headers,
    )
    assert response.status_code == 404


async def test_invoice_html_endpoint(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    response = await client.get(f"/invoices/{invoice['id']}/html", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "FACTURE" in response.text
    assert invoice["reference"] in response.text


async def test_invoice_pdf_endpoint(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    # 200 when Chromium is installed, else a clean 503.
    # The endpoint renders in Starlette's threadpool, where sync Chromium works.
    response = await client.get(f"/invoices/{invoice['id']}/pdf", headers=headers)
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")


async def test_draft_invoice_pdf_endpoint(client):
    headers, company, record = await _setup(client)
    draft = await create_draft(client, headers, company["id"], record["id"])

    # A draft has no reference yet; the filename must fall back, not crash.
    response = await client.get(f"/invoices/{draft['id']}/pdf", headers=headers)
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        assert response.content.startswith(b"%PDF")
        disposition = response.headers["content-disposition"]
        assert "draft-" in disposition


async def test_invoice_peppol_endpoint(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    response = await client.get(
        f"/invoices/{invoice['id']}/peppol.xml", headers=headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    root = ET.fromstring(response.text)
    assert root.findtext(f"{{{NS_CBC}}}ID") == invoice["reference"]

    audit = await client.get(
        "/activity", params={"target_type": "invoice"}, headers=headers
    )
    actions = [entry["action"] for entry in audit.json()]
    assert "export_peppol" in actions


async def test_invoices_are_tenant_isolated(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    bob = await signup(client, email="bob@example.com", organization_name="Org B")
    bob_get = await client.get(f"/invoices/{invoice['id']}", headers=bearer(bob))
    assert bob_get.status_code == 404

    bob_void = await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "attack"}, headers=bearer(bob)
    )
    assert bob_void.status_code == 404


# ---- T-51: overdue is the calendar's word, not a column's ------------------
# Nothing writes OVERDUE to a row, so `?status=overdue` compared a column that
# never held it and answered [] on every database there had ever been. The
# filter and the response field both read the due date now; `today` pins it so
# these assertions never move with the clock.


async def test_overdue_is_derived_from_the_calendar_not_stored(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    assert invoice["due_date"] == "2026-08-03"

    # Still on time on the due date itself; late the day after.
    on_time = await client.get(
        "/invoices", params={"status": "overdue", "today": "2026-08-03"}, headers=headers
    )
    assert on_time.status_code == 200, on_time.text
    assert on_time.json() == []

    late = await client.get(
        "/invoices", params={"status": "overdue", "today": "2026-08-04"}, headers=headers
    )
    assert [row["id"] for row in late.json()] == [invoice["id"]]
    assert late.json()[0]["status"] == "issued"
    assert late.json()[0]["effective_status"] == "overdue"

    # The stored status still answers as stored: an overdue invoice is an
    # issued one, and "outstanding" (issued + partially paid) has to keep it.
    issued = await client.get(
        "/invoices", params={"status": "issued", "today": "2026-08-04"}, headers=headers
    )
    assert [row["id"] for row in issued.json()] == [invoice["id"]]
    assert issued.json()[0]["effective_status"] == "overdue"

    single = await client.get(
        f"/invoices/{invoice['id']}", params={"today": "2026-08-04"}, headers=headers
    )
    assert single.json()["status"] == "issued"
    assert single.json()["effective_status"] == "overdue"


async def test_a_part_paid_invoice_past_due_is_overdue_and_a_settled_one_is_not(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    partial = await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "500.00", "paid_on": "2026-07-10"},
        headers=headers,
    )
    assert partial.status_code == 201, partial.text

    late = await client.get(
        "/invoices", params={"status": "overdue", "today": "2026-09-16"}, headers=headers
    )
    assert [(row["status"], row["effective_status"]) for row in late.json()] == [
        ("partially_paid", "overdue")
    ]

    settled = await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "1012.50", "paid_on": "2026-07-11"},
        headers=headers,
    )
    assert settled.status_code == 201, settled.text

    none_late = await client.get(
        "/invoices", params={"status": "overdue", "today": "2026-09-16"}, headers=headers
    )
    assert none_late.json() == []
    paid = await client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert (paid.json()["status"], paid.json()["effective_status"]) == ("paid", "paid")
