from decimal import Decimal

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    signup,
)


async def _setup(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    return headers, company, invoice


async def test_issue_credit_note_voids_invoice(client):
    headers, company, invoice = await _setup(client)

    response = await client.post(
        "/credit-notes",
        json={
            "invoice_id": invoice["id"],
            "reason": "Client cancelled",
            "issue_date": "2026-07-05",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    note = response.json()
    assert note["reference"] == "CN-ACME-2026/0001"
    assert Decimal(str(note["total_ttc"])) == Decimal("1512.50")

    updated = await client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert updated.json()["status"] == "voided"
    assert updated.json()["voided_by_credit_note_id"] == note["id"]

    html = await client.get(f"/credit-notes/{note['id']}/html", headers=headers)
    assert html.status_code == 200
    assert "NOTE DE CRÉDIT" in html.text
    assert invoice["reference"] in html.text

    listed = await client.get(
        "/credit-notes", params={"company_id": company["id"]}, headers=headers
    )
    assert len(listed.json()) == 1


async def test_credit_note_on_voided_invoice_409(client):
    headers, _, invoice = await _setup(client)
    first = await client.post(
        "/credit-notes",
        json={"invoice_id": invoice["id"], "reason": "first"},
        headers=headers,
    )
    assert first.status_code == 201
    second = await client.post(
        "/credit-notes",
        json={"invoice_id": invoice["id"], "reason": "second"},
        headers=headers,
    )
    assert second.status_code == 409


async def test_partial_then_full_payment(client):
    headers, _, invoice = await _setup(client)

    partial = await client.post(
        "/payments",
        json={
            "invoice_id": invoice["id"],
            "amount": "500.00",
            "paid_on": "2026-07-20",
        },
        headers=headers,
    )
    assert partial.status_code == 201, partial.text
    assert partial.json()["invoice_status"] == "partially_paid"

    full = await client.post(
        "/payments",
        json={
            "invoice_id": invoice["id"],
            "amount": "1012.50",
            "paid_on": "2026-07-25",
        },
        headers=headers,
    )
    assert full.json()["invoice_status"] == "paid"

    listed = await client.get(
        "/payments", params={"invoice_id": invoice["id"]}, headers=headers
    )
    amounts = [Decimal(str(p["amount"])) for p in listed.json()]
    assert sum(amounts) == Decimal("1512.50")


async def test_overpayment_409(client):
    headers, _, invoice = await _setup(client)
    response = await client.post(
        "/payments",
        json={
            "invoice_id": invoice["id"],
            "amount": "2000.00",
            "paid_on": "2026-07-20",
        },
        headers=headers,
    )
    assert response.status_code == 409


async def test_unknown_payment_method_422(client):
    headers, _, invoice = await _setup(client)
    response = await client.post(
        "/payments",
        json={
            "invoice_id": invoice["id"],
            "amount": "100.00",
            "paid_on": "2026-07-20",
            "method": "crypto",
        },
        headers=headers,
    )
    assert response.status_code == 422
