"""A client is a data subject (T-35).

T-35's assertions: the export returns the client's data and the invoices it
names; erasure leaves the client's invoices unchanged — asserted byte-for-byte
on `GET /invoices/{id}`, on the re-rendered PDF, and on the T-27 file — and the
audit log records both without carrying what was erased; a consent decision
recorded is read back with the version it was given for.
"""

import hashlib

import pytest

from .conftest import (
    FAKE_PDF,
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    signup,
)

pytestmark = pytest.mark.asyncio


async def workspace(client, email="subject@example.com"):
    headers = bearer(await signup(client, email=email, organization_name="Controller SRL"))
    company = await create_company(client, headers)
    record = await create_client_record(
        client, headers, company["id"], email="marie@bigcorp.be", phone="+32 2 555 01 02",
        notes="prefers invoices on Fridays",
    )
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    return headers, company, record, invoice


async def test_the_export_holds_the_client_and_what_names_them(client):
    headers, _company, record, invoice = await workspace(client)
    paid = await client.post(
        "/payments",
        json={"invoice_id": invoice["id"], "amount": "100.00", "paid_on": "2026-07-10"},
        headers=headers,
    )
    assert paid.status_code == 201, paid.text

    exported = await client.post(f"/clients/{record['id']}/privacy/export", headers=headers)
    assert exported.status_code == 200, exported.text
    body = exported.json()
    assert body["format"] == "billgen-privacy-export"
    assert body["client"]["email"] == "marie@bigcorp.be"
    assert [i["reference"] for i in body["invoices"]] == [invoice["reference"]]
    assert len(body["payments"]) == 1
    assert {"invoices", "clients"} <= set(body["retained"])

    #  Handing a person's data over is an event.
    activity = (await client.get(f"/activity?target_id={record['id']}", headers=headers)).json()
    assert "privacy_export" in {entry["action"] for entry in activity}


async def test_erasure_blanks_contact_channels_and_leaves_every_invoice_byte_identical(
    archiving_client,
):
    client, root = archiving_client
    headers, _company, record, invoice = await workspace(client)
    invoice_before = (await client.get(f"/invoices/{invoice['id']}", headers=headers)).json()
    pdf_before = (await client.get(f"/invoices/{invoice['id']}/pdf", headers=headers)).content
    archived = root / "invoices" / "2026" / f"{invoice['reference']}.pdf"
    file_before = hashlib.sha256(archived.read_bytes()).hexdigest()

    erased = await client.post(f"/clients/{record['id']}/privacy/erase", headers=headers)
    assert erased.status_code == 200, erased.text
    body = erased.json()
    assert body["erased"] == ["email", "phone", "notes"]
    assert "name" in body["retained"] and "vat_number" in body["retained"]
    assert body["invoices_untouched"] == 1
    assert body["retained_because"]

    after = (await client.get(f"/clients/{record['id']}", headers=headers)).json()
    assert after["email"] is None and after["phone"] is None and after["notes"] is None
    #  The invoice prints these; they stay.
    assert after["name"] == record["name"]
    assert after["vat_number"] == record["vat_number"]
    assert after["address_line1"] == record["address_line1"]

    #  The three places the invoice lives, all unchanged.
    invoice_after = await client.get(f"/invoices/{invoice['id']}", headers=headers)
    pdf_after = await client.get(f"/invoices/{invoice['id']}/pdf", headers=headers)
    assert invoice_after.json() == invoice_before
    assert pdf_after.content == pdf_before
    assert hashlib.sha256(archived.read_bytes()).hexdigest() == file_before

    #  Recorded, and without the values it erased.
    activity = (await client.get(f"/activity?target_id={record['id']}", headers=headers)).json()
    entry = next(e for e in activity if e["action"] == "privacy_erase")
    assert entry["before"] == {"held": ["email", "phone", "notes"]}
    assert "marie@bigcorp.be" not in str(entry)


async def test_erasure_needs_the_admin_permission(client):
    from .test_authz import as_role  # noqa: PLC0415

    #  `as_role` signs in as the fixture's default user, so the workspace has
    #  to be theirs.
    headers, _company, record, _invoice = await workspace(client, email="alice@example.com")
    member = bearer(await as_role(client, "member"))
    refused = await client.post(f"/clients/{record['id']}/privacy/erase", headers=member)
    assert refused.status_code == 403
    #  Reading, and therefore exporting, is every member's.
    allowed = await client.post(f"/clients/{record['id']}/privacy/export", headers=member)
    assert allowed.status_code == 200


async def test_a_consent_decision_is_read_back_with_its_version(client):
    headers = bearer(await signup(client))

    empty = (await client.get("/consent", headers=headers)).json()
    assert empty == {"current": None, "history": []}

    recorded = await client.post(
        "/consent",
        json={"policy_version": "2026-09", "state": {"analytics": True}, "source": "settings"},
        headers=headers,
    )
    assert recorded.status_code == 201, recorded.text
    body = recorded.json()
    assert body["policy_version"] == "2026-09"
    #  Normalised: omitted categories take their default, essential stays on.
    assert body["state"]["analytics"] is True
    assert body["state"]["essential"] is True
    assert body["state"]["marketing"] is False

    changed = await client.post(
        "/consent",
        json={"policy_version": "2026-09", "state": {"analytics": False}},
        headers=headers,
    )
    assert changed.status_code == 201
    status = (await client.get("/consent", headers=headers)).json()
    assert status["current"]["state"]["analytics"] is False
    assert len(status["history"]) == 2

    unknown = await client.post(
        "/consent",
        json={"policy_version": "2026-09", "state": {"telemetry": True}},
        headers=headers,
    )
    assert unknown.status_code == 409


async def test_FAKE_PDF_is_what_the_archived_file_holds_so_the_byte_check_is_real(archiving_client):
    """A guard on the test above: if the stub ever stopped writing the same
    bytes the archive keeps, "byte-identical" would compare nothing."""
    client, root = archiving_client
    headers, _company, _record, invoice = await workspace(client)
    assert (root / "invoices" / "2026" / f"{invoice['reference']}.pdf").read_bytes() == FAKE_PDF
