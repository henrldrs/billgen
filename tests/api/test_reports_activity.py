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


async def test_vat_report_endpoint(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])

    await create_invoice(client, headers, company["id"], record["id"])  # Jul 4, 21%
    cancelled = await create_invoice(client, headers, company["id"], record["id"])
    await client.post(
        "/credit-notes",
        json={"invoice_id": cancelled["id"], "reason": "cancelled", "issue_date": "2026-10-02"},
        headers=headers,
    )

    q3 = await client.get(
        "/reports/vat",
        params={"company_id": company["id"], "period": "2026-Q3"},
        headers=headers,
    )
    assert q3.status_code == 200, q3.text
    body = q3.json()
    assert body["period_start"] == "2026-07-01"
    assert body["period_end"] == "2026-09-30"
    assert body["covers"] == "output_vat_only"
    assert body["invoice_count"] == 2
    assert Decimal(str(body["net_vat"])) == Decimal("525.00")
    assert [line["grid"] for line in body["lines"]] == ["03"]

    q4 = await client.get(
        "/reports/vat",
        params={"company_id": company["id"], "period": "2026-Q4"},
        headers=headers,
    )
    assert Decimal(str(q4.json()["net_vat"])) == Decimal("-262.50")


async def test_vat_report_rejects_a_malformed_period(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)

    response = await client.get(
        "/reports/vat",
        params={"company_id": company["id"], "period": "last quarter"},
        headers=headers,
    )
    assert response.status_code == 422


# ── GET /reports/payments ──────────────────────────────────────────────────
#
# The payments screen shipped printing no total because this did not exist.
# Summing the rows in the browser gives the total of the *page*, which is a
# different number from the total of the filter, and the wrong one.


async def _paid_workspace(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    other = await create_client_record(client, headers, company["id"], name="Second NV")
    return headers, company, record, other


async def _pay(client, headers, invoice_id, amount, paid_on, method="bank_transfer"):
    response = await client.post(
        "/payments",
        json={
            "invoice_id": invoice_id,
            "amount": amount,
            "paid_on": paid_on,
            "method": method,
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _payment_report(client, headers, company, **params):
    response = await client.get(
        "/reports/payments",
        params={"company_id": company["id"], **params},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


async def test_payment_report_totals_the_filter_not_the_page(client):
    headers, company, record, _ = await _paid_workspace(client)
    first = await create_invoice(client, headers, company["id"], record["id"])
    second = await create_invoice(client, headers, company["id"], record["id"])
    await _pay(client, headers, first["id"], "1000.00", "2026-07-10")
    await _pay(client, headers, first["id"], "512.50", "2026-07-20", method="cash")
    await _pay(client, headers, second["id"], "200.00", "2026-08-03")

    body = await _payment_report(client, headers, company)

    assert body["payment_count"] == 3
    assert Decimal(body["total"]) == Decimal("1712.50")
    assert Decimal(body["largest"]) == Decimal("1000.00")
    assert body["first_payment_on"] == "2026-07-10"
    assert body["last_payment_on"] == "2026-08-03"
    assert body["currency"] == "EUR"


async def test_payment_report_splits_by_method(client):
    headers, company, record, _ = await _paid_workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    await _pay(client, headers, invoice["id"], "1000.00", "2026-07-10")
    await _pay(client, headers, invoice["id"], "512.50", "2026-07-20", method="cash")

    body = await _payment_report(client, headers, company)

    by_method = {m["method"]: m for m in body["methods"]}
    assert Decimal(by_method["bank_transfer"]["total"]) == Decimal("1000.00")
    assert by_method["bank_transfer"]["count"] == 1
    assert Decimal(by_method["cash"]["total"]) == Decimal("512.50")


async def test_payment_report_counts_the_month_the_money_arrived(client):
    """Cash in, not revenue: a July invoice paid in August is August's.

    This and /reports/invoices legitimately disagree across a period boundary,
    and both are right — they answer different questions.
    """
    headers, company, record, _ = await _paid_workspace(client)
    invoice = await create_invoice(
        client, headers, company["id"], record["id"], issue_date="2026-07-04"
    )
    await _pay(client, headers, invoice["id"], "1512.50", "2026-08-05")

    body = await _payment_report(client, headers, company)
    assert body["by_month"] == {"2026-08": "1512.50"}
    assert body["count_by_month"] == {"2026-08": 1}

    july = await _payment_report(client, headers, company, period="2026-07")
    assert july["payment_count"] == 0
    assert Decimal(july["total"]) == Decimal("0.00")

    august = await _payment_report(client, headers, company, period="2026-08")
    assert Decimal(august["total"]) == Decimal("1512.50")
    assert august["period"] == "2026-08"


async def test_payment_report_narrows_to_one_client(client):
    headers, company, record, other = await _paid_workspace(client)
    mine = await create_invoice(client, headers, company["id"], record["id"])
    theirs = await create_invoice(client, headers, company["id"], other["id"])
    await _pay(client, headers, mine["id"], "100.00", "2026-07-10")
    await _pay(client, headers, theirs["id"], "250.00", "2026-07-11")

    body = await _payment_report(client, headers, company, client_id=other["id"])

    assert body["payment_count"] == 1
    assert Decimal(body["total"]) == Decimal("250.00")


async def test_payment_report_is_empty_and_still_well_formed(client):
    """An empty report reads 0.00, not 0 — a money column that changes scale
    mid-table is a formatting bug waiting to happen in whatever renders it."""
    headers, company, _, _ = await _paid_workspace(client)

    body = await _payment_report(client, headers, company)

    assert body["total"] == "0.00"
    assert body["largest"] == "0.00"
    assert body["methods"] == []
    assert body["by_month"] == {}
    assert body["first_payment_on"] is None
    assert body["skipped_other_currency"] == 0


async def test_payment_report_rejects_a_malformed_period(client):
    headers, company, _, _ = await _paid_workspace(client)

    response = await client.get(
        "/reports/payments",
        params={"company_id": company["id"], "period": "last-quarter"},
        headers=headers,
    )

    assert response.status_code == 422


async def test_activity_filters_by_actor(client):
    """Settings > Activity asks "what did this person do".

    Filtered in SQL rather than in Python: an audit log is the one table that
    grows without bound, so slicing it after the fact would read the whole
    organization's history to show one user's.
    """
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    await create_client_record(client, headers, company["id"])

    everything = (await client.get("/activity", headers=headers)).json()
    assert len(everything) >= 2

    mine = await client.get(
        "/activity", headers=headers, params={"actor_user_id": alice["user_id"]}
    )
    assert mine.status_code == 200
    assert len(mine.json()) == len(everything)
    assert all(e["actor_user_id"] == alice["user_id"] for e in mine.json())

    import uuid
    nobody = await client.get(
        "/activity", headers=headers, params={"actor_user_id": str(uuid.uuid4())}
    )
    assert nobody.json() == []
