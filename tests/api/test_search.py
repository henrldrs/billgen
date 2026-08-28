"""GET /search — the lookup the command palette shipped without.

What is being pinned:

1. **An invoice number finds the invoice.** The reason the endpoint exists: it
   is what someone types off a bank statement.
2. **A search box is tenant-scoped like everything else.** Another org's
   invoice number returns nothing, not a hit the caller cannot open.
3. **LIKE metacharacters are data.** `%` in a search box means percent.
4. **A one-character term returns nothing, not everything** — and not a 422:
   the user is mid-word, and an error for an unfinished word is noise.
"""

from decimal import Decimal

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    signup,
)


async def seeded(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    record = await create_client_record(
        client, headers, company["id"], name="Brasserie du Nord", vat_number="BE0999999900"
    )
    issued = await create_invoice(client, headers, company["id"], record["id"])
    return headers, company, record, issued


async def search(client, headers, q: str, **params) -> dict:
    query = "".join(f"&{k}={v}" for k, v in params.items())
    response = await client.get(f"/search?q={q}{query}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


async def test_an_invoice_is_found_by_its_number(client):
    headers, _, _, issued = await seeded(client)

    body = await search(client, headers, issued["reference"])

    hit = next(h for h in body["hits"] if h["kind"] == "invoice")
    assert hit["id"] == issued["id"]
    assert hit["title"] == issued["reference"]
    assert hit["status"] == "issued"
    assert Decimal(str(hit["amount"])) == Decimal("1512.50")
    assert hit["currency"] == "EUR"


async def test_a_partial_reference_is_enough(client):
    """Nobody types the whole thing — the tail of a number off a bank line is
    what actually gets pasted in."""
    headers, _, _, issued = await seeded(client)

    body = await search(client, headers, issued["reference"][-4:])

    assert any(h["id"] == issued["id"] for h in body["hits"])


async def test_a_client_is_found_by_name_email_or_vat(client):
    headers, company, record, _ = await seeded(client)
    await create_client_record(
        client, headers, company["id"], name="Zuid NV", email="pay@zuid.be", vat_number=None
    )

    by_name = await search(client, headers, "brasserie")
    assert [h["id"] for h in by_name["hits"] if h["kind"] == "client"] == [record["id"]]

    by_vat = await search(client, headers, "BE0999999900")
    assert [h["id"] for h in by_vat["hits"] if h["kind"] == "client"] == [record["id"]]

    by_email = await search(client, headers, "pay@zuid.be")
    assert [h["title"] for h in by_email["hits"] if h["kind"] == "client"] == ["Zuid NV"]


async def test_search_is_case_insensitive(client):
    headers, _, record, _ = await seeded(client)

    body = await search(client, headers, "BRASSERIE")

    assert any(h["id"] == record["id"] for h in body["hits"])


async def test_a_product_is_found_by_name(client):
    headers, company, _, _ = await seeded(client)
    product = (
        await client.post(
            "/products",
            json={
                "company_id": company["id"],
                "name": "Consulting day",
                "unit_price": "750.00",
                "category": "Services",
            },
            headers=headers,
        )
    ).json()

    body = await search(client, headers, "consulting")

    hit = next(h for h in body["hits"] if h["kind"] == "product")
    assert hit["id"] == product["id"]
    assert hit["subtitle"] == "Services"
    assert hit["status"] == "active"


async def test_a_credit_note_is_found_by_its_own_reference(client):
    headers, company, record, issued = await seeded(client)
    note = (
        await client.post(
            "/credit-notes",
            json={"invoice_id": issued["id"], "reason": "Returned goods"},
            headers=headers,
        )
    ).json()

    body = await search(client, headers, note["reference"])

    hit = next(h for h in body["hits"] if h["kind"] == "credit_note")
    assert hit["id"] == note["id"]


async def test_a_draft_is_findable_too(client):
    """A draft has no reference, so it is not found by number — but the search
    must not blow up on the None it carries instead."""
    headers, company, record, _ = await seeded(client)
    await create_draft(client, headers, company["id"], record["id"])

    body = await search(client, headers, "brasserie")

    assert body["counts"]["client"] == 1


async def test_another_organizations_records_are_invisible(client):
    headers, _, _, issued = await seeded(client)
    intruder = bearer(await signup(client, email="mallory@example.com"))

    body = await search(client, intruder, issued["reference"])

    assert body["hits"] == []
    assert body["counts"] == {
        "invoice": 0,
        "quote": 0,
        "credit_note": 0,
        "client": 0,
        "product": 0,
    }


async def test_like_metacharacters_are_data_not_wildcards(client):
    """`%` in a search box means percent. Unescaped it matches every row, which
    would turn a typo into "here is your entire database"."""
    headers, _, record, _ = await seeded(client)

    body = await search(client, headers, "%")

    assert body["hits"] == []

    underscore = await search(client, headers, "_a")
    assert underscore["hits"] == []


async def test_a_term_that_is_too_short_returns_nothing(client):
    headers, _, _, _ = await seeded(client)

    body = await search(client, headers, "b")

    assert body["hits"] == []
    assert body["counts"] == {}
    assert body["truncated"] is False


async def test_the_result_says_when_there_may_be_more(client):
    headers, company, _, _ = await seeded(client)
    for index in range(6):
        await create_client_record(
            client, headers, company["id"], name=f"Noord {index}", vat_number=None
        )

    body = await search(client, headers, "noord", limit=5)

    assert body["counts"]["client"] == 5
    assert body["truncated"] is True

    roomier = await search(client, headers, "noord", limit=25)
    assert roomier["counts"]["client"] == 6
    assert roomier["truncated"] is False


async def test_search_requires_authentication(client):
    assert (await client.get("/search?q=anything")).status_code == 401
