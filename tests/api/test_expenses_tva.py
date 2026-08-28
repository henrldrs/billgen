"""Expenses and the TVA position, end to end.

The tests that matter here are the refusals. `tests/core/tva/` already covers the
pure logic — classification tables, the state machine, document checks — so
these cover the things only the service and the router can get wrong: that a
distrusted document never acquires a recoverable amount, that a client cannot
post the money itself, and that the confirmed and potential halves stay apart
all the way to the wire.
"""

from decimal import Decimal

import pytest

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    signup,
)


async def import_expense(client, headers, company_id, **extracted):
    fields = {
        "supplier_name": "Brasserie du Coin",
        "supplier_vat_number": "BE0456789012",
        "invoice_number": "F-2026-118",
        "invoice_date": "2026-03-04",
        "subtotal_ht": "100.00",
        "tva_rate": "21",
        "tva_amount": "21.00",
        "total_ttc": "121.00",
        "expense_category": "office_supplies",
    }
    fields.update(extracted)
    response = await client.post(
        "/expenses/import",
        headers=headers,
        json={"company_id": str(company_id), "extracted": fields},
    )
    return response


@pytest.fixture()
async def org(client):
    payload = await signup(client)
    headers = bearer(payload)
    company = await create_company(client, headers)
    return client, headers, company["id"]


async def test_a_clean_document_is_analyzed_and_classified(org):
    client, headers, company_id = org
    response = await import_expense(client, headers, company_id)
    assert response.status_code == 201, response.text
    body = response.json()

    assert body["state"] == "analyzed"
    assert body["classification"] is not None
    assert body["failure_code"] is None


async def test_a_second_copy_of_the_same_document_is_refused_a_classification(org):
    """The duplicate rule, and the reason it is a service concern.

    `core/tva/validation.py` can only see one document at a time. Catching this
    needs the repository, which is why `find_duplicate` exists at all.
    """
    client, headers, company_id = org
    first = await import_expense(client, headers, company_id)
    assert first.status_code == 201

    second = await import_expense(client, headers, company_id)
    assert second.status_code == 201
    body = second.json()

    assert body["duplicate_of_id"] == first.json()["id"]
    assert body["state"] == "failed"
    assert body["failure_code"] == "duplicate_document"
    #  The point of the whole rule: a document we do not trust never carries a
    #  number the period analysis could sum.
    assert body["classification"] is None
    assert body["needs_attention"] is True


async def test_an_arithmetically_broken_document_is_not_classified(org):
    client, headers, company_id = org
    response = await import_expense(
        client, headers, company_id, tva_amount="99.00", invoice_number="F-2026-119"
    )
    assert response.status_code == 201
    body = response.json()
    assert body["state"] == "failed"
    assert body["failure_code"] == "failed_checks"
    assert body["classification"] is None


async def test_review_confirms_the_amount_and_the_client_cannot_supply_it(org):
    client, headers, company_id = org
    expense_id = (await import_expense(client, headers, company_id)).json()["id"]

    response = await client.post(
        f"/expenses/{expense_id}/review",
        headers=headers,
        # A recoverable_amount here is silently ignored: the schema has no such
        # field, so extra="forbid" is not even reached. That is the design.
        json={"treatment": "recoverable"},
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["state"] == "reviewed"
    assert body["classification"]["confirmed_at"] is not None
    assert body["classification"]["confirmed_by"] is not None
    assert Decimal(body["classification"]["recoverable_amount"]) == Decimal("21.00")


async def test_a_partial_treatment_recomputes_rather_than_trusting_the_percentage(org):
    client, headers, company_id = org
    expense_id = (await import_expense(client, headers, company_id)).json()["id"]

    response = await client.post(
        f"/expenses/{expense_id}/review",
        headers=headers,
        json={"treatment": "partial", "deductible_percent": 50},
    )
    assert response.status_code == 200, response.text
    assert Decimal(response.json()["classification"]["recoverable_amount"]) == Decimal(
        "10.50"
    )


async def test_an_unreviewed_expense_stays_out_of_estimated_payable(org):
    """The blueprint's locked decision, on the wire.

    A machine's guess is `potential_recoverable`. Only a human's decision moves
    money into `confirmed_recoverable`, and only that half reaches
    `estimated_payable`.
    """
    client, headers, company_id = org
    await import_expense(client, headers, company_id)

    response = await client.get(
        "/tva/position",
        headers=headers,
        params={"company_id": company_id, "start": "2026-01-01", "end": "2026-12-31"},
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert Decimal(body["confirmed_recoverable"]) == Decimal("0")
    assert Decimal(body["potential_recoverable"]) > Decimal("0")
    # collected - confirmed, never collected - potential.
    assert Decimal(body["estimated_payable"]) == Decimal(body["collected"])
    #  There is deliberately no single "recoverable" total to read.
    assert "recoverable" not in body


async def test_reviewing_moves_the_amount_into_the_confirmed_half(org):
    client, headers, company_id = org
    expense_id = (await import_expense(client, headers, company_id)).json()["id"]
    await client.post(
        f"/expenses/{expense_id}/review",
        headers=headers,
        json={"treatment": "recoverable"},
    )

    body = (
        await client.get(
            "/tva/position",
            headers=headers,
            params={"company_id": company_id, "start": "2026-01-01", "end": "2026-12-31"},
        )
    ).json()

    assert Decimal(body["confirmed_recoverable"]) == Decimal("21.00")
    assert Decimal(body["estimated_payable"]) == Decimal(body["collected"]) - Decimal(
        "21.00"
    )


async def test_position_refuses_a_backwards_period(org):
    client, headers, company_id = org
    response = await client.get(
        "/tva/position",
        headers=headers,
        params={"company_id": company_id, "start": "2026-12-31", "end": "2026-01-01"},
    )
    assert response.status_code == 422


async def test_expenses_are_scoped_to_their_organization(client):
    """The cross-tenant probe, for the newest table in the tree."""
    alice = bearer(await signup(client))
    alice_company = (await create_company(client, alice))["id"]
    expense_id = (await import_expense(client, alice, alice_company)).json()["id"]

    bob = bearer(
        await signup(client, email="bob@example.com", organization_name="Bob BV")
    )
    assert (await client.get(f"/expenses/{expense_id}", headers=bob)).status_code == 404
    assert (await client.get("/expenses", headers=bob)).json() == []


async def test_collected_vat_comes_from_issued_invoices(org):
    """The half of the position that is NOT about expenses.

    Every earlier test here ran against an organization with no invoices, so
    `_collected_vat` looped zero times and its body was never executed. That is
    exactly how `InvoiceStatus.VOID` — a name that does not exist; the member is
    `VOIDED` — survived the suite and only failed when the real app asked for a
    position against a database with an invoice in it. This test issues one.
    """
    client, headers, company_id = org
    customer = await create_client_record(client, headers, company_id)
    invoice = await create_invoice(client, headers, company_id, customer["id"])
    assert invoice["status"] == "issued"

    response = await client.get(
        "/tva/position",
        headers=headers,
        params={"company_id": company_id, "start": "2020-01-01", "end": "2030-12-31"},
    )
    assert response.status_code == 200, response.text
    body = response.json()

    collected = Decimal(body["collected"])
    assert collected == Decimal(invoice["total_vat"])
    assert collected > Decimal("0")
    # Nothing recoverable has been confirmed, so the whole of it is payable.
    assert Decimal(body["estimated_payable"]) == collected
