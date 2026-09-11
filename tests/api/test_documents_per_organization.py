"""Two tenants, one document path (T-33).

Measured before it was fixed: two organizations, each with a company named the
way the fixtures name them, both issued `ACME-BC07012026`, and one file was
left on disk — the second tenant's PDF over the first's. The database was
never wrong (`documents` is unique per organization); the folder was.
"""

import httpx
import pytest

from api.config import Settings
from api.main import create_app
from conftest import TEST_DATABASE_URL, dispose_test_engine, make_test_engine

from .conftest import FAKE_PDF, bearer, create_client_record, create_company, create_invoice, signup

pytestmark = pytest.mark.asyncio


@pytest.fixture()
async def hosted_client(tmp_path, stub_pdf_engine):
    """The hosted shape: DOCUMENT_ROOT set, layout left at its default."""
    engine = make_test_engine()
    settings = Settings(
        database_url=TEST_DATABASE_URL,
        jwt_secret="test-secret-0123456789abcdef-0123456789",
        document_root=str(tmp_path),
    )
    assert settings.document_layout == "per-organization"
    app = create_app(settings=settings, engine=engine)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, tmp_path
    dispose_test_engine(engine)


async def issue_one(client, email, organization_name):
    auth = await signup(client, email=email, organization_name=organization_name)
    headers = bearer(auth)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    invoice = await create_invoice(client, headers, company["id"], record["id"])
    return auth["organization_id"], headers, invoice


async def test_two_organizations_issuing_the_same_reference_leave_two_files(hosted_client):
    client, root = hosted_client
    org_a, headers_a, first = await issue_one(client, "a@example.com", "A")
    org_b, headers_b, second = await issue_one(client, "b@example.com", "B")

    #  The precondition the bug needs: the same reference in both tenants.
    assert first["reference"] == second["reference"]

    files = sorted(path.relative_to(root).as_posix() for path in root.rglob("*.pdf"))
    assert files == sorted(
        [
            f"{org_a}/invoices/2026/{first['reference']}.pdf",
            f"{org_b}/invoices/2026/{second['reference']}.pdf",
        ]
    )
    for path in files:
        assert (root / path).read_bytes() == FAKE_PDF

    #  The register never carries the segment: what each tenant sees is the
    #  same relative path a desktop install would write, so a backup moves
    #  between the two layouts unchanged.
    for headers in (headers_a, headers_b):
        listed = (await client.get("/documents", headers=headers)).json()
        assert listed["documents"][0]["path"] == f"invoices/2026/{first['reference']}.pdf"
    assert (await client.get("/documents", headers=headers_a)).json()["root"] == str(
        root / org_a
    )


async def test_one_tenant_cannot_see_or_rebuild_into_another_tenants_folder(hosted_client):
    """`rebuild` writes where the archive points, and the archive points at
    the caller's own directory — so a rebuild in A repairs A's files only."""
    client, root = hosted_client
    org_a, headers_a, first = await issue_one(client, "a@example.com", "A")
    org_b, _headers_b, second = await issue_one(client, "b@example.com", "B")
    (root / org_a / "invoices" / "2026" / f"{first['reference']}.pdf").unlink()
    (root / org_b / "invoices" / "2026" / f"{second['reference']}.pdf").unlink()

    report = (await client.post("/documents/rebuild", headers=headers_a)).json()

    assert report["written"] == 1
    assert (root / org_a / "invoices" / "2026" / f"{first['reference']}.pdf").is_file()
    assert not (root / org_b / "invoices" / "2026" / f"{second['reference']}.pdf").exists()
