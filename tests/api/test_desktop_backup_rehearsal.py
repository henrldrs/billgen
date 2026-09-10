"""A file the sidecar wrote, restored through the API (T-23).

`tests/desktop/test_backups.py` asserts the archive's shape. This asserts the
thing the shape is *for*: take a zip the way it lands in
`<data dir>/backups/`, feed a member of it to `POST /backup/restore`, and get
the invoice back with its number and its total.

It runs against a **file-backed** database on purpose. `write_backup` opens its
own engine from a URL, exactly as the sidecar does at boot, and the suite's
default in-memory database would not survive crossing that boundary — so an
in-memory rehearsal would prove the code path and not the product.

What this still is not: a restore on Emilia's machine, from a file that
travelled, into an install that had lost its data. That is the rest of T-23 and
it needs her laptop. A restore that has only ever run against a database the
test made is a belief with good manners.
"""

import json
from decimal import Decimal
from zipfile import ZipFile

import httpx
import pytest

from api.config import Settings
from api.main import create_app
from db.engine import make_engine
from db.models import Base
from desktop import backups

from .conftest import bearer, create_client_record, create_company, create_invoice, signup

pytestmark = pytest.mark.asyncio


@pytest.fixture()
async def file_backed(tmp_path):
    """(client, database_url) — an app on a real SQLite file."""
    url = f"sqlite:///{(tmp_path / 'billgen.db').as_posix()}"
    engine = make_engine(url)
    Base.metadata.create_all(engine)
    settings = Settings(
        database_url=url, jwt_secret="test-secret-0123456789abcdef-0123456789"
    )
    app = create_app(settings=settings, engine=engine)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, url
    engine.dispose()


async def test_a_sidecar_archive_restores_into_an_empty_organization(file_backed, tmp_path):
    client, url = file_backed
    headers = bearer(
        await signup(client, email="emilia@example.com", organization_name="Emilia SRL")
    )
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    written = backups.write_backup(url, data_dir=tmp_path)
    assert written is not None

    with ZipFile(written) as archive:
        manifest = json.loads(archive.read(backups.MANIFEST_NAME))
        entry = manifest["organizations"][0]
        assert entry["invoices"] == 1
        payload = json.loads(archive.read(entry["file"]))

    #  The machine after the accident: a fresh account, nothing in it.
    fresh = bearer(
        await signup(client, email="after@example.com", organization_name="Recovered")
    )
    restored = await client.post("/backup/restore", json=payload, headers=fresh)
    assert restored.status_code == 200, restored.text
    assert restored.json()["invoices"] == 1

    rows = (await client.get("/invoices", headers=fresh)).json()
    assert len(rows) == 1
    assert rows[0]["reference"] == invoice["reference"]
    #  Compared as a number, not a string: money round-trips through the
    #  backup at the column's scale-6, so "1512.50" comes back "1512.500000".
    assert Decimal(rows[0]["total_ttc"]) == Decimal(invoice["total_ttc"])

    #  The half of ADR-0003 that a shape check cannot see: the series continues
    #  where it stopped rather than reissuing a number already on a document.
    company_again = (await client.get("/companies", headers=fresh)).json()[0]
    clients_again = (await client.get("/clients", headers=fresh)).json()
    following = await create_invoice(
        client, fresh, company_again["id"], clients_again[0]["id"]
    )
    assert following["reference"] != invoice["reference"]
    assert following["sequence_global"] == invoice["sequence_global"] + 1
