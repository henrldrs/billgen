"""A backup that can be carried (T-28).

The ticket's assertions, in order: an encrypted export restores into an empty
database with the right passphrase; a wrong passphrase fails with a distinct
error **and no partial write**; and the plain export does not change. Plus the
one the ticket words as a UI requirement — that a person is told the passphrase
cannot be recovered *before* the first export rather than after — asserted here
as something the API refuses to do rather than something a screen promises.
"""

import json
from io import BytesIO
from zipfile import ZipFile

import pytest

from core.backup import PAYLOAD_NAME, is_sealed, read_header, unseal

from .conftest import (
    FAKE_PDF,
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    signup,
)

pytestmark = pytest.mark.asyncio

PASSPHRASE = "the shed behind the house"


async def workspace(client, email="carrier@example.com", organization_name="Carrier SRL"):
    headers = bearer(await signup(client, email=email, organization_name=organization_name))
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


async def export_encrypted(client, headers, passphrase=PASSPHRASE, **overrides):
    body = {"passphrase": passphrase, "acknowledge_unrecoverable": True}
    body.update(overrides)
    return await client.post("/backup/export/encrypted", json=body, headers=headers)


async def test_an_encrypted_export_carries_the_documents_and_restores(archiving_client):
    client, root = archiving_client
    headers, company, record = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    exported = await export_encrypted(client, headers)
    assert exported.status_code == 200, exported.text
    blob = exported.content
    assert exported.headers["x-backup-documents"] == "1"
    assert exported.headers["x-backup-documents-skipped"] == "0"

    #  Sealed, and readable enough to know what it is without opening it.
    assert is_sealed(blob)
    header = read_header(blob)
    assert header["cipher"] == "AES-256-GCM"
    assert header["organization"] == "Carrier SRL"
    assert header["documents"] == 1
    assert invoice["reference"].encode() not in blob

    #  Inside: the same JSON the plain export returns, plus the PDF itself.
    with ZipFile(BytesIO(unseal(blob, PASSPHRASE))) as archive:
        payload = json.loads(archive.read(PAYLOAD_NAME))
        document = f"documents/invoices/2026/{invoice['reference']}.pdf"
        assert archive.read(document) == FAKE_PDF
    assert payload["format"] == "billgen-backup"

    #  The machine after the accident: an empty organization, an empty folder.
    other = bearer(await signup(client, email="new@example.com", organization_name="Recovered"))
    (root / "invoices" / "2026" / f"{invoice['reference']}.pdf").unlink()

    restored = await client.post(
        "/backup/restore/file",
        content=blob,
        headers={**other, "X-Backup-Passphrase": PASSPHRASE},
    )
    assert restored.status_code == 200, restored.text
    report = restored.json()
    assert report["invoices"] == 1
    assert report["documents"] == 1
    #  The difference this ticket exists for: the file came back, so nothing
    #  is missing. The plain export's restore reports it as missing instead.
    assert report["documents_restored"] == 1
    assert report["missing_documents"] == []
    assert report["altered_documents"] == []
    assert (root / "invoices" / "2026" / f"{invoice['reference']}.pdf").read_bytes() == FAKE_PDF


async def test_a_wrong_passphrase_fails_distinctly_and_writes_nothing(archiving_client):
    client, _root = archiving_client
    headers, company, record = await workspace(client)
    await create_invoice(client, headers, company["id"], record["id"])
    blob = (await export_encrypted(client, headers)).content

    other = bearer(await signup(client, email="wrong@example.com", organization_name="Wrong"))
    refused = await client.post(
        "/backup/restore/file",
        content=blob,
        headers={**other, "X-Backup-Passphrase": "the shed behind the hous"},
    )

    assert refused.status_code == 409
    detail = refused.json()["detail"]
    assert "passphrase" in detail
    assert "recover" in detail

    #  No partial write: decryption happens before anything touches the
    #  database, so the organization is still the empty one it was.
    assert (await client.get("/companies", headers=other)).json() == []
    assert (await client.get("/invoices", headers=other)).json() == []
    assert (await client.get("/documents", headers=other)).json()["documents"] == []


async def test_an_encrypted_archive_will_not_restore_without_its_passphrase(archiving_client):
    client, _root = archiving_client
    headers, company, record = await workspace(client)
    await create_invoice(client, headers, company["id"], record["id"])
    blob = (await export_encrypted(client, headers)).content

    other = bearer(await signup(client, email="none@example.com", organization_name="None"))
    refused = await client.post("/backup/restore/file", content=blob, headers=other)

    assert refused.status_code == 409
    assert "encrypted" in refused.json()["detail"]


async def test_the_same_endpoint_restores_a_plain_export(archiving_client):
    """"Restore accepts both and asks for a passphrase only when the header
    says so" — the plain JSON export, posted as a file, with no passphrase."""
    client, root = archiving_client
    headers, company, record = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    plain = (await client.get("/backup/export", headers=headers)).json()
    (root / "invoices" / "2026" / f"{invoice['reference']}.pdf").unlink()

    other = bearer(await signup(client, email="plain@example.com", organization_name="Plain"))
    restored = await client.post(
        "/backup/restore/file", content=json.dumps(plain).encode(), headers=other
    )

    assert restored.status_code == 200, restored.text
    assert restored.json()["invoices"] == 1
    #  No bytes travelled with it, so the copy is named as missing — which is
    #  the whole reason the encrypted archive exists.
    assert restored.json()["missing_documents"] == [
        f"invoices/2026/{invoice['reference']}.pdf"
    ]


async def test_the_plain_export_did_not_change(archiving_client):
    """T-28's third assertion. The encrypted archive wraps this JSON; it does
    not replace it, and a person who cannot run a restore must still be able to
    read their own data out of a file they already have."""
    client, _root = archiving_client
    headers, company, record = await workspace(client)
    await create_invoice(client, headers, company["id"], record["id"])

    plain = (await client.get("/backup/export", headers=headers)).json()
    blob = (await export_encrypted(client, headers)).content
    with ZipFile(BytesIO(unseal(blob, PASSPHRASE))) as archive:
        inside = json.loads(archive.read(PAYLOAD_NAME))

    #  Same shape, same schema, same rows. The two differ only in the fields
    #  that are a clock or an id — the export writes an audit entry, so the
    #  second call legitimately has one more of those.
    assert inside["format"] == plain["format"]
    assert inside["schema_version"] == plain["schema_version"]
    for key in ("companies", "clients", "invoices", "documents", "sequences"):
        assert inside[key] == plain[key], key


async def test_an_export_nobody_can_open_is_refused_until_it_is_acknowledged(
    archiving_client,
):
    """The ticket words this as a UI requirement. A screen that promises to
    warn is a screen someone can change; this is the API refusing to produce
    an unrecoverable file until the caller says they know it is one."""
    client, _root = archiving_client
    headers, _company, _record = await workspace(client)

    refused = await export_encrypted(client, headers, acknowledge_unrecoverable=False)
    assert refused.status_code == 422
    assert "cannot be recovered" in refused.json()["detail"]

    notice = (await client.get("/backup/passphrase-notice", headers=headers)).json()
    assert "cannot be recovered" in notice["notice"]
    assert notice["minimum_length"] >= 12


async def test_a_short_passphrase_is_refused(archiving_client):
    client, _root = archiving_client
    headers, _company, _record = await workspace(client)

    refused = await export_encrypted(client, headers, passphrase="short")

    assert refused.status_code == 422


async def test_a_document_that_no_longer_matches_the_register_does_not_travel(
    archiving_client,
):
    """The archive's one read of the folder, and the reason it is safe: bytes
    that do not hash to what was recorded at issue are named in the manifest
    instead of being carried under the original's name."""
    client, root = archiving_client
    headers, company, record = await workspace(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    (root / "invoices" / "2026" / f"{invoice['reference']}.pdf").write_bytes(b"%PDF-edited")

    exported = await export_encrypted(client, headers)

    assert exported.headers["x-backup-documents"] == "0"
    assert exported.headers["x-backup-documents-skipped"] == "1"
    with ZipFile(BytesIO(unseal(exported.content, PASSPHRASE))) as archive:
        manifest = json.loads(archive.read("MANIFEST.json"))
    assert manifest["documents_not_included"] == [
        f"invoices/2026/{invoice['reference']}.pdf"
    ]


async def test_an_empty_body_is_refused(archiving_client):
    client, _root = archiving_client
    headers, _company, _record = await workspace(client)
    refused = await client.post("/backup/restore/file", content=b"", headers=headers)
    assert refused.status_code == 422


async def test_junk_is_refused_as_neither_kind_of_backup(archiving_client):
    client, _root = archiving_client
    headers, _company, _record = await workspace(client)
    refused = await client.post(
        "/backup/restore/file", content=b"not a backup at all", headers=headers
    )
    assert refused.status_code == 409
    assert "neither an archive nor a JSON export" in refused.json()["detail"]
