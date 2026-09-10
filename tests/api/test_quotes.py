"""Quotes: their own series, their own life, and one door to an invoice.

The rules being pinned, in the order they matter:

1. **A quote never touches the invoice sequence.** Most offers are refused, and
   a refused offer that had consumed an invoice number would leave a hole in a
   series Belgian law requires to be gapless (ADR-0001).
2. **Converting produces a DRAFT.** The gapless number is still consumed by
   POST /invoices/{id}/issue and nowhere else — a customer's "yes" must not
   mint a VAT document.
3. **The state machine is a machine.** A decided quote stays decided; the way
   to change your mind is a new offer, which is also what the customer expects
   to receive.
4. **Expiry is derived.** A quote past `valid_until` reads as expired the
   moment it is looked at, with no scheduler having run.
"""

from decimal import Decimal

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    signup,
)


def quote_payload(company_id: str, client_id: str, **overrides) -> dict:
    """Same 10 x 125.00 @ 21% as `invoice_payload` — HT 1250.00, TTC 1512.50."""
    payload = {
        "company_id": company_id,
        "client_id": client_id,
        "issue_date": "2026-07-04",
        "valid_until": "2026-08-04",
        "lines": [
            {
                "description": "Consulting — July",
                "quantity": "10",
                "unit_price": "125.00",
                "vat": {"category": "S", "rate": "21"},
            }
        ],
    }
    payload.update(overrides)
    return payload


async def workspace(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


async def create_quote(client, headers, company, record, **overrides) -> dict:
    response = await client.post(
        "/quotes", json=quote_payload(company["id"], record["id"], **overrides), headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def accepted_quote(client, headers, company, record, **overrides) -> dict:
    quote = await create_quote(client, headers, company, record, **overrides)
    await client.post(f"/quotes/{quote['id']}/send", headers=headers)
    response = await client.post(f"/quotes/{quote['id']}/accept", json={}, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


# ── Numbering ──────────────────────────────────────────────────────────────


async def test_a_quote_is_numbered_at_creation(client):
    """Unlike an invoice draft: there is no gapless obligation to protect by
    withholding the number, and a reference is what the customer quotes back."""
    headers, company, record = await workspace(client)

    quote = await create_quote(client, headers, company, record)

    assert quote["reference"].startswith("Q-ACME-2026/")
    assert quote["sequence_global"] == 1
    assert quote["status"] == "draft"
    assert Decimal(quote["total_ttc"]) == Decimal("1512.50")


async def test_the_quote_series_is_not_the_invoice_series(client):
    headers, company, record = await workspace(client)

    first = await create_quote(client, headers, company, record)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    second = await create_quote(client, headers, company, record)

    # Both series start at 1 and advance independently.
    assert [first["sequence_global"], second["sequence_global"]] == [1, 2]
    assert invoice["sequence_global"] == 1
    assert not invoice["reference"].startswith("Q-")


async def test_a_rejected_quote_leaves_the_invoice_series_untouched(client):
    """The reason quotes count themselves: most offers are refused."""
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)
    await client.post(f"/quotes/{quote['id']}/send", headers=headers)
    await client.post(f"/quotes/{quote['id']}/reject", json={}, headers=headers)

    invoice = await create_invoice(client, headers, company["id"], record["id"])

    assert invoice["sequence_global"] == 1


# ── The state machine ──────────────────────────────────────────────────────


async def test_the_happy_path_walks_draft_to_converted(client):
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)

    sent = await client.post(f"/quotes/{quote['id']}/send", headers=headers)
    assert sent.json()["status"] == "sent"
    assert sent.json()["sent_at"] is not None

    accepted = await client.post(
        f"/quotes/{quote['id']}/accept", json={"note": "Signed by M. Peeters"}, headers=headers
    )
    assert accepted.json()["status"] == "accepted"
    assert accepted.json()["decision_note"] == "Signed by M. Peeters"
    assert accepted.json()["decided_at"] is not None

    converted = await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)
    assert converted.status_code == 201, converted.text
    assert converted.json()["quote"]["status"] == "converted"


async def test_a_draft_cannot_be_accepted_before_it_is_sent(client):
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)

    response = await client.post(f"/quotes/{quote['id']}/accept", json={}, headers=headers)

    assert response.status_code == 409, response.text


async def test_a_decided_quote_stays_decided(client):
    """The honest way to change your mind about a refused offer is a new offer."""
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)
    await client.post(f"/quotes/{quote['id']}/send", headers=headers)
    await client.post(f"/quotes/{quote['id']}/reject", json={}, headers=headers)

    revived = await client.post(f"/quotes/{quote['id']}/accept", json={}, headers=headers)

    assert revived.status_code == 409, revived.text


async def test_a_quote_cannot_expire_before_it_is_issued(client):
    headers, company, record = await workspace(client)

    response = await client.post(
        "/quotes",
        json=quote_payload(
            company["id"], record["id"], issue_date="2026-07-04", valid_until="2026-07-01"
        ),
        headers=headers,
    )

    assert response.status_code == 409, response.text


# ── Derived expiry ─────────────────────────────────────────────────────────


async def test_expiry_is_derived_not_scheduled(client):
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)
    await client.post(f"/quotes/{quote['id']}/send", headers=headers)

    inside = await client.get(f"/quotes/{quote['id']}?today=2026-07-20", headers=headers)
    assert inside.json()["effective_status"] == "sent"

    past = await client.get(f"/quotes/{quote['id']}?today=2026-09-01", headers=headers)
    # Nothing ran in between: the stored status still says what was written
    # down, and the derived one says what it means now.
    assert past.json()["status"] == "sent"
    assert past.json()["effective_status"] == "expired"


async def test_expiring_by_hand_writes_the_state_down(client):
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)
    await client.post(f"/quotes/{quote['id']}/send", headers=headers)

    expired = await client.post(f"/quotes/{quote['id']}/expire", headers=headers)

    assert expired.json()["status"] == "expired"
    # And it is now terminal, like any other decision.
    assert (
        await client.post(f"/quotes/{quote['id']}/accept", json={}, headers=headers)
    ).status_code == 409


# ── Conversion ─────────────────────────────────────────────────────────────


async def test_conversion_produces_a_draft_not_an_invoice_number(client):
    headers, company, record = await workspace(client)
    quote = await accepted_quote(client, headers, company, record)

    body = (
        await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)
    ).json()

    assert body["invoice_status"] == "draft"
    invoice = (await client.get(f"/invoices/{body['invoice_id']}", headers=headers)).json()
    assert invoice["reference"] is None
    assert invoice["sequence_global"] is None
    # The offer, unchanged, down to the money.
    assert Decimal(invoice["total_ttc"]) == Decimal("1512.50")
    assert invoice["lines"][0]["description"] == "Consulting — July"
    assert invoice["lines"][0]["vat"]["rate"] == "21.00"


async def test_the_invoice_number_is_still_consumed_only_at_issue(client):
    headers, company, record = await workspace(client)
    quote = await accepted_quote(client, headers, company, record)
    converted = (
        await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)
    ).json()

    issued = await client.post(
        f"/invoices/{converted['invoice_id']}/issue", json={}, headers=headers
    )

    assert issued.status_code == 200, issued.text
    assert issued.json()["sequence_global"] == 1


async def test_a_quote_converts_once(client):
    headers, company, record = await workspace(client)
    quote = await accepted_quote(client, headers, company, record)
    await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)

    again = await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)

    assert again.status_code == 409, again.text


async def test_only_an_accepted_quote_converts(client):
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)
    await client.post(f"/quotes/{quote['id']}/send", headers=headers)

    response = await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)

    assert response.status_code == 409, response.text


async def test_the_converted_quote_keeps_a_link_to_its_invoice(client):
    headers, company, record = await workspace(client)
    quote = await accepted_quote(client, headers, company, record)

    body = (
        await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)
    ).json()

    assert body["quote"]["converted_invoice_id"] == body["invoice_id"]


# ── Deletion ───────────────────────────────────────────────────────────────


async def test_a_quote_that_never_became_an_invoice_can_be_deleted(client):
    """ADR-0002 does not apply here — it exists because an issued invoice
    consumed a gapless number, and a quote's series has no fiscal meaning."""
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)

    deleted = await client.delete(f"/quotes/{quote['id']}", headers=headers)

    assert deleted.status_code == 204
    assert (await client.get(f"/quotes/{quote['id']}", headers=headers)).status_code == 404


async def test_a_converted_quote_cannot_be_deleted(client):
    """It is the invoice's trail back to what was agreed."""
    headers, company, record = await workspace(client)
    quote = await accepted_quote(client, headers, company, record)
    await client.post(f"/quotes/{quote['id']}/convert", json={}, headers=headers)

    response = await client.delete(f"/quotes/{quote['id']}", headers=headers)

    assert response.status_code == 409, response.text


# ── Listing, isolation, permissions ────────────────────────────────────────


async def test_quotes_filter_by_status_and_client(client):
    headers, company, record = await workspace(client)
    other = await create_client_record(client, headers, company["id"], name="Second NV")
    kept = await create_quote(client, headers, company, record)
    await create_quote(client, headers, company, other)
    await client.post(f"/quotes/{kept['id']}/send", headers=headers)

    sent = await client.get("/quotes?status=sent", headers=headers)
    assert [q["id"] for q in sent.json()] == [kept["id"]]

    theirs = await client.get(f"/quotes?client_id={other['id']}", headers=headers)
    assert [q["client_id"] for q in theirs.json()] == [other["id"]]

    bogus = await client.get("/quotes?status=pending", headers=headers)
    assert bogus.status_code == 422


async def test_another_organizations_quote_is_invisible(client):
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)
    intruder = bearer(await signup(client, email="mallory@example.com"))

    assert (await client.get(f"/quotes/{quote['id']}", headers=intruder)).status_code == 404
    assert (await client.get("/quotes", headers=intruder)).json() == []


async def test_a_quote_is_findable_by_its_reference(client):
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)

    body = (await client.get(f"/search?q={quote['reference']}", headers=headers)).json()

    hit = next(h for h in body["hits"] if h["kind"] == "quote")
    assert hit["id"] == quote["id"]


async def test_quotes_travel_in_the_backup(client):
    """A new aggregate that the backup does not know about is data loss dressed
    up as a feature."""
    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)

    payload = (await client.get("/backup/export", headers=headers)).json()

    assert [q["reference"] for q in payload["quotes"]] == [quote["reference"]]
    assert payload["schema_version"] == 3


async def test_a_viewer_cannot_write_a_quote(client):
    from .test_authz import as_role

    headers, company, record = await workspace(client)
    quote = await create_quote(client, headers, company, record)
    viewer = bearer(await as_role(client, "viewer"))

    created = await client.post(
        "/quotes", json=quote_payload(company["id"], record["id"]), headers=viewer
    )
    assert created.status_code == 403
    assert created.json()["permission"] == "quote.write"

    assert (await client.get(f"/quotes/{quote['id']}", headers=viewer)).status_code == 200
