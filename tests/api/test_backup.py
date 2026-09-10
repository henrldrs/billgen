"""Organization backup & restore (ADR-0003): full roundtrip through the API,
the empty-org restore guard, format validation, and — the invariant that
matters — gapless sequence continuation after a restore."""

import pytest

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    signup,
)

pytestmark = pytest.mark.asyncio


async def build_source_org(client) -> tuple[dict, dict]:
    """Signup + company + client + one issued & paid invoice. Returns
    (auth headers, exported backup payload)."""
    auth = await signup(client, email="source@example.com", organization_name="Source Org")
    headers = bearer(auth)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    # One quote too: an aggregate the backup does not carry is data loss
    # dressed up as a feature, and the roundtrip below is what proves it does.
    quote = await client.post(
        "/quotes",
        json={
            "company_id": company["id"],
            "client_id": record["id"],
            "issue_date": "2026-07-04",
            "lines": [
                {"description": "Offer", "quantity": "1", "unit_price": "500.00"}
            ],
        },
        headers=headers,
    )
    assert quote.status_code == 201, quote.text
    paid = await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "1512.50", "paid_on": "2026-07-10"},
        headers=headers,
    )
    assert paid.status_code == 201, paid.text

    exported = await client.get("/backup/export", headers=headers)
    assert exported.status_code == 200, exported.text
    return headers, exported.json()


async def test_export_shape_and_counts(client):
    _, payload = await build_source_org(client)

    assert payload["format"] == "billgen-backup"
    assert payload["schema_version"] == 3
    assert payload["organization"]["name"] == "Source Org"
    assert len(payload["companies"]) == 1
    assert len(payload["clients"]) == 1
    assert len(payload["invoices"]) == 1
    assert len(payload["payments"]) == 1
    # The issued invoice consumed the invoice series and a monthly bucket.
    scopes = {entry["scope"] for entry in payload["sequences"]}
    assert "invoice" in scopes
    assert payload["audit_log"], "audit history travels with the backup"
    # Credentials must never leak into a backup file.
    assert "users" not in payload
    assert "credentials" not in payload


async def test_restore_roundtrip_preserves_data_and_continues_sequence(client):
    _, payload = await build_source_org(client)
    source_invoice = payload["invoices"][0]

    fresh = await signup(client, email="fresh@example.com", organization_name="Fresh Org")
    fresh_headers = bearer(fresh)

    restored = await client.post("/backup/restore", json=payload, headers=fresh_headers)
    assert restored.status_code == 200, restored.text
    report = restored.json()
    assert report == {
        "companies": 1,
        "clients": 1,
        "products": 0,
        "invoices": 1,
        "quotes": len(payload["quotes"]),
        "credit_notes": 1 if payload["credit_notes"] else 0,
        "payments": 1,
        #  No DOCUMENT_ROOT on this app, so nothing was ever archived. The
        #  register travelling full is tests/api/test_documents.py.
        "documents": 0,
        "missing_documents": [],
        "sequences": report["sequences"],  # count depends on bucket scopes
        "audit_entries": len(payload["audit_log"]),
    }
    assert report["sequences"] >= 2  # invoice series + at least one bucket

    # The restored invoice is visible in the new org with its original
    # reference and stored totals.
    invoices = await client.get("/invoices", headers=fresh_headers)
    assert invoices.status_code == 200
    rows = invoices.json()
    assert len(rows) == 1
    assert rows[0]["reference"] == source_invoice["reference"]
    assert rows[0]["total_ttc"] == source_invoice["total_ttc"]

    # Restore mints fresh ids (no collision with the source org, which still
    # lives in this same DB) — look the entities up in the new org.
    companies = (await client.get("/companies", headers=fresh_headers)).json()
    clients = (
        await client.get(f"/clients?company_id={companies[0]['id']}", headers=fresh_headers)
    ).json()
    assert companies[0]["id"] != payload["companies"][0]["id"]

    # The quote came back too, with its own reference, and its series continues
    # independently of the invoice one.
    quotes = await client.get("/quotes", headers=fresh_headers)
    assert [q["reference"] for q in quotes.json()] == [payload["quotes"][0]["reference"]]

    # THE invariant: issuing the next invoice continues the gapless series
    # instead of restarting at 1 (which would duplicate a legal number).
    next_invoice = await create_invoice(
        client, fresh_headers, companies[0]["id"], clients[0]["id"]
    )
    assert next_invoice["sequence_global"] == source_invoice["sequence_global"] + 1
    assert next_invoice["reference"] != source_invoice["reference"]

    # The restore itself is on the record.
    activity = await client.get("/activity", headers=fresh_headers)
    assert activity.status_code == 200
    actions = [entry["action"] for entry in activity.json()]
    assert "restore" in actions


async def test_restore_refuses_an_organization_with_data(client):
    headers, payload = await build_source_org(client)
    response = await client.post("/backup/restore", json=payload, headers=headers)
    assert response.status_code == 409
    assert "empty organization" in response.json()["detail"]


async def test_restore_refuses_foreign_or_broken_files(client):
    fresh = await signup(client, email="picky@example.com", organization_name="Picky Org")
    headers = bearer(fresh)

    not_a_backup = await client.post(
        "/backup/restore", json={"format": "something-else"}, headers=headers
    )
    assert not_a_backup.status_code == 409

    wrong_version = await client.post(
        "/backup/restore",
        json={"format": "billgen-backup", "schema_version": 99},
        headers=headers,
    )
    assert wrong_version.status_code == 409

    tampered = await client.post(
        "/backup/restore",
        json={
            "format": "billgen-backup",
            "schema_version": 1,
            "companies": [{"name": 42}],
        },
        headers=headers,
    )
    assert tampered.status_code == 409
