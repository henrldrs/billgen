from decimal import Decimal

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    signup,
)


async def test_kpi_and_revenue(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])

    paid = await create_invoice(client, headers, company["id"], record["id"])
    await client.post(
        "/payments",
        json={"invoice_id": paid["id"], "amount": "1512.50", "paid_on": "2026-08-01"},
        headers=headers,
    )
    await create_invoice(client, headers, company["id"], record["id"])  # stays unpaid

    cancelled = await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-08-01"
    )
    await client.post(
        "/credit-notes",
        json={"invoice_id": cancelled["id"], "reason": "cancelled"},
        headers=headers,
    )

    kpi = await client.get(
        "/reports/kpi",
        params={"company_id": company["id"], "today": "2026-08-15"},
        headers=headers,
    )
    assert kpi.status_code == 200
    body = kpi.json()
    assert Decimal(str(body["invoiced_total"])) == Decimal("3025.00")
    assert Decimal(str(body["paid_total"])) == Decimal("1512.50")
    assert Decimal(str(body["outstanding_total"])) == Decimal("1512.50")
    assert body["counts"]["paid"] == 1
    assert body["counts"]["overdue"] == 1
    assert body["counts"]["voided"] == 1
    assert body["overdue_count"] == 1

    revenue = await client.get(
        "/reports/revenue",
        params={"company_id": company["id"], "year": 2026},
        headers=headers,
    )
    months = revenue.json()["months"]
    assert Decimal(str(months["7"])) == Decimal("3025.00")
    assert "8" not in months  # August invoice was voided


async def test_activity_lists_and_limits(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    await create_invoice(client, headers, company["id"], record["id"])

    everything = await client.get("/activity", headers=headers)
    assert everything.status_code == 200
    target_types = {entry["target_type"] for entry in everything.json()}
    # signup wrote 'organization'; company/client/invoice creation wrote theirs
    assert {"organization", "company", "client", "invoice"} <= target_types

    limited = await client.get("/activity", params={"limit": 2}, headers=headers)
    assert len(limited.json()) == 2

    filtered = await client.get(
        "/activity", params={"target_type": "invoice"}, headers=headers
    )
    assert all(entry["target_type"] == "invoice" for entry in filtered.json())


async def test_activity_filters_by_target_id(client):
    """Client history and Client activity both read the audit log scoped to one
    record. Before this parameter the log could only be read whole or by type."""
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    other = await create_client_record(client, headers, company["id"], name="Other Corp")

    scoped = await client.get(
        "/activity", params={"target_id": record["id"]}, headers=headers
    )
    assert scoped.status_code == 200
    entries = scoped.json()
    assert entries, "creating the client wrote an audit entry"
    assert all(entry["target_id"] == record["id"] for entry in entries)
    assert all(entry["target_type"] == "client" for entry in entries)

    # An id is unique across types, so combining the two filters narrows.
    both = await client.get(
        "/activity",
        params={"target_id": record["id"], "target_type": "invoice"},
        headers=headers,
    )
    assert both.json() == []

    assert other["id"] not in {entry["target_id"] for entry in entries}


async def test_activity_is_tenant_isolated(client):
    alice = await signup(client, email="alice@example.com", organization_name="Org A")
    await create_company(client, bearer(alice))

    bob = await signup(client, email="bob@example.com", organization_name="Org B")
    bob_view = await client.get("/activity", headers=bearer(bob))
    target_types = {entry["target_type"] for entry in bob_view.json()}
    assert "company" not in target_types  # only sees own org's signup entry
