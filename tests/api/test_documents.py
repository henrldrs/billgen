"""Issued documents on disk (T-27).

The assertions the ticket asks for, in order: issuing leaves a PDF under
`invoices/<year>/`; deleting that file changes no endpoint's answer; the export
carries the register with its hashes; a restore into an empty database *reports*
the files it cannot find instead of failing. Plus the two failure modes that
would otherwise be discovered by a customer — an archive that is switched off,
and a PDF engine that is not there when an invoice is issued.
"""

import hashlib

import pytest

from core.services import pdf_service as pdf_service_module

from .conftest import (
    FAKE_PDF,
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    signup,
)

pytestmark = pytest.mark.asyncio


async def workspace(client) -> tuple[dict, dict, dict]:
    auth = await signup(client, email="archive@example.com", organization_name="Archive Org")
    headers = bearer(auth)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


async def test_issuing_writes_a_pdf_and_registers_it(archiving_client):
    client, root = archiving_client
    headers, company, record = await workspace(client)

    invoice = await create_invoice(client, headers, company["id"], record["id"])

    expected = root / "invoices" / "2026" / f"{invoice['reference']}.pdf"
    assert expected.is_file()
    assert expected.read_bytes() == FAKE_PDF

    listed = await client.get("/documents", headers=headers)
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert body["root"] == str(root)
    assert len(body["documents"]) == 1
    document = body["documents"][0]
    assert document["kind"] == "invoice"
    assert document["path"] == f"invoices/2026/{invoice['reference']}.pdf"
    assert document["sha256"] == hashlib.sha256(FAKE_PDF).hexdigest()
    assert document["byte_size"] == len(FAKE_PDF)
    assert document["target_id"] == invoice["id"]


async def test_deleting_the_file_changes_no_endpoint_answer(archiving_client):
    """The folder is a copy. The record is the database, and this is the test
    that says so — a user tidying a folder must not be editing a VAT record."""
    client, root = archiving_client
    headers, company, record = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    before = (await client.get(f"/invoices/{invoice['id']}", headers=headers)).json()
    (root / "invoices" / "2026" / f"{invoice['reference']}.pdf").unlink()

    after = await client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert after.status_code == 200
    assert after.json() == before

    pdf = await client.get(f"/invoices/{invoice['id']}/pdf", headers=headers)
    assert pdf.status_code == 200
    assert pdf.content == FAKE_PDF

    listed = (await client.get("/documents", headers=headers)).json()
    assert len(listed["documents"]) == 1


async def test_a_document_is_rendered_once(archiving_client):
    """Re-exporting a PDF must not re-write the archived one: the archived copy
    is the document as it was issued, not as the template renders today."""
    client, root = archiving_client
    headers, company, record = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    target = root / "invoices" / "2026" / f"{invoice['reference']}.pdf"
    target.write_bytes(b"%PDF-someone-else")

    await client.get(f"/invoices/{invoice['id']}/pdf", headers=headers)
    rebuilt = (await client.post("/documents/rebuild", headers=headers)).json()

    assert rebuilt["skipped"] == 1
    assert rebuilt["written"] == 0
    assert target.read_bytes() == b"%PDF-someone-else"


async def test_rebuild_backfills_and_repairs(archiving_client):
    """The one-shot: a file deleted after the fact comes back, and the invoice
    it belongs to is not re-numbered on the way."""
    client, root = archiving_client
    headers, company, record = await workspace(client)
    first = await create_invoice(client, headers, company["id"], record["id"])
    (root / "invoices" / "2026" / f"{first['reference']}.pdf").unlink()

    report = (await client.post("/documents/rebuild", headers=headers)).json()

    assert report["written"] == 1
    assert report["failed"] == 0
    assert report["rehashed"] == 0
    assert (root / "invoices" / "2026" / f"{first['reference']}.pdf").is_file()

    listed = (await client.get("/documents", headers=headers)).json()
    assert len(listed["documents"]) == 1


async def test_drafts_are_not_archived(archiving_client):
    client, root = archiving_client
    headers, company, record = await workspace(client)
    await create_draft(client, headers, company["id"], record["id"])

    assert not (root / "invoices").exists()
    listed = (await client.get("/documents", headers=headers)).json()
    assert listed["documents"] == []


async def test_a_broken_pdf_engine_does_not_fail_an_issue(archiving_client, monkeypatch):
    """The number is burned inside issue()'s transaction. Nothing about
    rendering may undo a legally issued invoice — it comes back, unarchived,
    and `rebuild` is the repair."""
    client, _root = archiving_client
    headers, company, record = await workspace(client)

    def explode(html):
        raise RuntimeError("no browser on this machine")

    monkeypatch.setattr(pdf_service_module, "html_to_pdf", explode)
    draft = await create_draft(client, headers, company["id"], record["id"])
    issued = await client.post(f"/invoices/{draft['id']}/issue", json={}, headers=headers)

    assert issued.status_code == 200
    assert issued.json()["reference"]
    assert (await client.get("/documents", headers=headers)).json()["documents"] == []


async def test_archiving_off_writes_nothing(client, stub_pdf_engine):
    """The default app has no DOCUMENT_ROOT: every endpoint answers, the
    register is empty, and `rebuild` is a no-op rather than an error."""
    headers, company, record = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    assert invoice["reference"]

    listed = (await client.get("/documents", headers=headers)).json()
    assert listed["root"] is None
    assert listed["documents"] == []

    report = (await client.post("/documents/rebuild", headers=headers)).json()
    assert report == {"written": 0, "skipped": 0, "failed": 0, "rehashed": 0, "errors": []}


async def test_backup_carries_the_register_and_a_restore_names_what_is_missing(
    archiving_client,
):
    client, root = archiving_client
    headers, company, record = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    exported = (await client.get("/backup/export", headers=headers)).json()
    assert exported["schema_version"] == 3
    assert len(exported["documents"]) == 1
    assert exported["documents"][0]["sha256"] == hashlib.sha256(FAKE_PDF).hexdigest()

    #  A different organization, empty, and a file that is no longer on disk.
    other = bearer(
        await signup(client, email="restore@example.com", organization_name="Restore Org")
    )
    (root / "invoices" / "2026" / f"{invoice['reference']}.pdf").unlink()

    restored = await client.post("/backup/restore", json=exported, headers=other)
    assert restored.status_code == 200, restored.text
    report = restored.json()
    assert report["invoices"] == 1
    assert report["documents"] == 1
    assert report["missing_documents"] == [f"invoices/2026/{invoice['reference']}.pdf"]
