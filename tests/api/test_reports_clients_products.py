"""GET /reports/clients and GET /reports/products.

What is being pinned:

1. **A draft is not a sale, and a voided invoice never was one.** Both reports
   count what every other money figure in the service counts.
2. **The client report is the table `GET /clients/{id}/stats` would have been
   called once per row to build.** Same numbers, one query.
3. **The product report counts lines, not documents** — including free-text
   lines, which is how most invoices are actually written.
4. **An invoice-level discount is not allocated down to products.** It belongs
   to the deal. This is stated in the docstring, and the arithmetic here is
   what makes it checkable.
"""

from decimal import Decimal

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    invoice_payload,
    signup,
)


async def workspace(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    big = await create_client_record(client, headers, company["id"], name="Big Corp")
    small = await create_client_record(client, headers, company["id"], name="Small NV")
    return headers, company, big, small


async def report(client, headers, company, kind: str, **params) -> dict:
    response = await client.get(
        f"/reports/{kind}", params={"company_id": company["id"], **params}, headers=headers
    )
    assert response.status_code == 200, response.text
    return response.json()


# ── /reports/clients ───────────────────────────────────────────────────────


async def test_clients_are_ranked_by_what_they_billed(client):
    headers, company, big, small = await workspace(client)
    await create_invoice(client, headers, company["id"], big["id"])
    await create_invoice(client, headers, company["id"], big["id"])
    await create_invoice(
        client,
        headers,
        company["id"],
        small["id"],
        lines=[
            {
                "description": "One day",
                "quantity": "1",
                "unit_price": "100.00",
                "vat": {"category": "S", "rate": "21"},
            }
        ],
    )

    body = await report(client, headers, company, "clients")

    assert [row["name"] for row in body["clients"]] == ["Big Corp", "Small NV"]
    assert body["clients"][0]["invoice_count"] == 2
    assert Decimal(body["clients"][0]["invoiced_total"]) == Decimal("3025.00")
    assert Decimal(body["clients"][1]["invoiced_total"]) == Decimal("121.00")
    assert body["client_count"] == 2
    assert Decimal(body["invoiced_total"]) == Decimal("3146.00")


async def test_payments_and_overdue_land_on_the_right_client(client):
    headers, company, big, _ = await workspace(client)
    invoice = await create_invoice(
        client, headers, company["id"], big["id"], issue_date="2026-07-04"
    )
    await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "512.50", "paid_on": "2026-07-20"},
        headers=headers,
    )

    body = await report(client, headers, company, "clients", today="2026-09-01")

    row = body["clients"][0]
    assert Decimal(row["paid_total"]) == Decimal("512.50")
    assert Decimal(row["outstanding_total"]) == Decimal("1000.00")
    assert row["overdue_count"] == 1
    # What is chased is the remainder, not the face value.
    assert Decimal(row["overdue_total"]) == Decimal("1000.00")
    assert row["last_invoice_date"] == "2026-07-04"


async def test_a_draft_puts_nobody_on_the_report(client):
    headers, company, big, _ = await workspace(client)
    await create_draft(client, headers, company["id"], big["id"])

    body = await report(client, headers, company, "clients")

    assert body["clients"] == []
    assert body["client_count"] == 0


async def test_a_voided_invoice_leaves_the_report(client):
    headers, company, big, _ = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], big["id"])

    before = await report(client, headers, company, "clients")
    assert before["client_count"] == 1

    await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "duplicate"}, headers=headers
    )
    after = await report(client, headers, company, "clients")

    assert after["clients"] == []


async def test_the_client_report_agrees_with_client_stats(client):
    """The whole reason it exists: same numbers, one query instead of N."""
    headers, company, big, _ = await workspace(client)
    await create_invoice(client, headers, company["id"], big["id"])

    row = (await report(client, headers, company, "clients"))["clients"][0]
    stats = (await client.get(f"/clients/{big['id']}/stats", headers=headers)).json()

    assert Decimal(row["invoiced_total"]) == Decimal(stats["invoiced_total"])
    assert Decimal(row["paid_total"]) == Decimal(stats["paid_total"])
    assert row["invoice_count"] == stats["invoice_count"]


async def test_the_client_report_respects_a_period(client):
    headers, company, big, _ = await workspace(client)
    await create_invoice(client, headers, company["id"], big["id"], issue_date="2026-07-04")

    inside = await report(client, headers, company, "clients", period="2026-Q3")
    assert inside["client_count"] == 1
    assert inside["period"] == "2026-Q3"

    outside = await report(client, headers, company, "clients", period="2026-Q1")
    assert outside["clients"] == []


# ── /reports/products ──────────────────────────────────────────────────────


async def catalogued(client, headers, company, name="Consulting day", price="125.00"):
    response = await client.post(
        "/products",
        json={"company_id": company["id"], "name": name, "unit_price": price},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_products_are_ranked_by_what_they_earned(client):
    headers, company, big, _ = await workspace(client)
    day = await catalogued(client, headers, company)
    licence = await catalogued(client, headers, company, name="Licence", price="50.00")
    payload = invoice_payload(company["id"], big["id"])
    payload["lines"] = [
        {
            "description": "Consulting — July",
            "quantity": "10",
            "unit_price": "125.00",
            "product_id": day["id"],
            "vat": {"category": "S", "rate": "21"},
        },
        {
            "description": "Licence",
            "quantity": "2",
            "unit_price": "50.00",
            "product_id": licence["id"],
            "vat": {"category": "S", "rate": "21"},
        },
    ]
    draft = (await client.post("/invoices", json=payload, headers=headers)).json()
    await client.post(f"/invoices/{draft['id']}/issue", json={}, headers=headers)

    body = await report(client, headers, company, "products")

    assert [row["name"] for row in body["products"]] == ["Consulting day", "Licence"]
    assert Decimal(body["products"][0]["net_ht"]) == Decimal("1250.00")
    assert Decimal(body["products"][0]["quantity"]) == Decimal("10")
    assert Decimal(body["products"][1]["net_ht"]) == Decimal("100.00")
    assert body["line_count"] == 2
    # Net HT, so no VAT anywhere in this report.
    assert Decimal(body["net_ht"]) == Decimal("1350.00")


async def test_free_text_lines_are_sales_too(client):
    """They are how most invoices are written; dropping them would report a
    revenue mix that adds up to less than the revenue."""
    headers, company, big, _ = await workspace(client)
    await create_invoice(client, headers, company["id"], big["id"])

    body = await report(client, headers, company, "products")

    assert [row["name"] for row in body["products"]] == ["(free-text lines)"]
    assert body["products"][0]["product_id"] is None
    assert Decimal(body["products"][0]["net_ht"]) == Decimal("1250.00")


async def test_a_line_discount_comes_off_but_a_document_discount_does_not(client):
    """The stated rule, made checkable: an invoice-level discount belongs to the
    deal, not to any one product."""
    headers, company, big, _ = await workspace(client)
    payload = invoice_payload(company["id"], big["id"])
    payload["lines"][0]["discount"] = {"type": "percentage", "value": "10"}
    payload["invoice_discount"] = {"type": "percentage", "value": "50"}
    draft = (await client.post("/invoices", json=payload, headers=headers)).json()
    issued = (
        await client.post(f"/invoices/{draft['id']}/issue", json={}, headers=headers)
    ).json()

    body = await report(client, headers, company, "products")

    # 1250.00 less the line's own 10%.
    assert Decimal(body["products"][0]["net_ht"]) == Decimal("1125.00")
    # And deliberately higher than what the invoice actually billed.
    assert Decimal(issued["subtotal_ht"]) - Decimal(issued["total_discount"]) < Decimal(
        body["net_ht"]
    )


async def test_a_deleted_catalogue_entry_still_names_its_line(client):
    """The invoice line is the record; an id nothing matches is labelled rather
    than dropped. Products cannot be deleted today — this is the archived and
    renamed case reaching the same code path."""
    headers, company, big, _ = await workspace(client)
    day = await catalogued(client, headers, company)
    payload = invoice_payload(company["id"], big["id"])
    payload["lines"][0]["product_id"] = day["id"]
    draft = (await client.post("/invoices", json=payload, headers=headers)).json()
    await client.post(f"/invoices/{draft['id']}/issue", json={}, headers=headers)
    await client.patch(
        f"/products/{day['id']}", json={"name": "Consulting day (2027)"}, headers=headers
    )

    body = await report(client, headers, company, "products")

    assert body["products"][0]["name"] == "Consulting day (2027)"
    assert body["products"][0]["invoice_count"] == 1


async def test_drafts_and_voids_sell_nothing(client):
    headers, company, big, _ = await workspace(client)
    await create_draft(client, headers, company["id"], big["id"])
    voided = await create_invoice(client, headers, company["id"], big["id"])
    await client.post(
        f"/invoices/{voided['id']}/void", json={"reason": "duplicate"}, headers=headers
    )

    body = await report(client, headers, company, "products")

    assert body["products"] == []
    assert body["line_count"] == 0
    assert body["net_ht"] == "0.00"


async def test_both_reports_reject_a_malformed_period(client):
    headers, company, _, _ = await workspace(client)

    for kind in ("clients", "products"):
        response = await client.get(
            f"/reports/{kind}",
            params={"company_id": company["id"], "period": "last-quarter"},
            headers=headers,
        )
        assert response.status_code == 422, kind


async def test_both_reports_404_an_unknown_company(client):
    headers, _, _, _ = await workspace(client)

    for kind in ("clients", "products"):
        response = await client.get(
            f"/reports/{kind}",
            params={"company_id": "00000000-0000-0000-0000-000000000000"},
            headers=headers,
        )
        assert response.status_code == 404, kind
