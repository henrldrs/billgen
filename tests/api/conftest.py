import httpx
import pytest

from api.config import Settings
from api.main import create_app
from conftest import TEST_DATABASE_URL, dispose_test_engine, make_test_engine
from core.services import pdf_service as pdf_service_module


@pytest.fixture()
async def client():
    engine = make_test_engine()
    settings = Settings(
        database_url=TEST_DATABASE_URL,
        jwt_secret="test-secret-0123456789abcdef-0123456789",
        jwt_access_ttl_min=15,
        jwt_refresh_ttl_days=30,
    )
    app = create_app(settings=settings, engine=engine)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    dispose_test_engine(engine)


async def signup(
    client: httpx.AsyncClient,
    email: str = "alice@example.com",
    password: str = "s3cret-pass",
    display_name: str = "Alice",
    organization_name: str = "Acme SPRL",
) -> dict:
    response = await client.post(
        "/auth/signup",
        json={
            "email": email,
            "password": password,
            "display_name": display_name,
            "organization_name": organization_name,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def bearer(payload: dict) -> dict:
    return {"Authorization": f"Bearer {payload['tokens']['access_token']}"}


async def create_company(
    client: httpx.AsyncClient, headers: dict, name: str = "Acme Consulting", **overrides
) -> dict:
    payload = {
        "name": name,
        "legal_name": "Acme Consulting SPRL",
        "vat_number": "BE0123456749",
        "address_line1": "Rue de la Loi 1",
        "postal_code": "1000",
        "city": "Bruxelles",
        "iban": "BE68539007547034",
        "bic": "GKCCBEBB",
        "invoice_reference_prefix": "ACME-",
    }
    payload.update(overrides)
    response = await client.post("/companies", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


async def create_client_record(
    client: httpx.AsyncClient,
    headers: dict,
    company_id: str,
    name: str = "Big Corp",
    **overrides,
) -> dict:
    payload = {
        "company_id": company_id,
        "name": name,
        "vat_number": "BE9876543265",
        "address_line1": "Grote Markt 5",
        "postal_code": "2000",
        "city": "Antwerpen",
    }
    payload.update(overrides)
    response = await client.post("/clients", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def invoice_payload(company_id: str, client_id: str, **overrides) -> dict:
    """10 x 125.00 @ 21% on 2026-07-04 -> HT 1250.00, VAT 262.50, TTC 1512.50."""
    payload = {
        "company_id": company_id,
        "client_id": client_id,
        "issue_date": "2026-07-04",
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


async def create_draft(
    client: httpx.AsyncClient, headers: dict, company_id: str, client_id: str, **overrides
) -> dict:
    """POST /invoices creates a DRAFT (no number consumed)."""
    response = await client.post(
        "/invoices", json=invoice_payload(company_id, client_id, **overrides), headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_invoice(
    client: httpx.AsyncClient, headers: dict, company_id: str, client_id: str, **overrides
) -> dict:
    """Create a draft and issue it — the common "I need an issued invoice" path."""
    draft = await create_draft(client, headers, company_id, client_id, **overrides)
    issued = await client.post(f"/invoices/{draft['id']}/issue", json={}, headers=headers)
    assert issued.status_code == 200, issued.text
    return issued.json()


# ── An app that archives documents (T-27), for the tests that need one ──────

FAKE_PDF = b"%PDF-fake-archived"


@pytest.fixture()
def stub_pdf_engine(monkeypatch):
    """No Edge, no Playwright: these tests are about where the bytes go, not
    how they are made. `tests/core/pdf/` exercises the real engine."""
    monkeypatch.setattr(pdf_service_module, "html_to_pdf", lambda html: FAKE_PDF)


@pytest.fixture()
async def archiving_client(tmp_path, stub_pdf_engine):
    """An app whose DOCUMENT_ROOT is a temp folder. Yields (client, root)."""
    engine = make_test_engine()
    settings = Settings(
        database_url=TEST_DATABASE_URL,
        jwt_secret="test-secret-0123456789abcdef-0123456789",
        document_root=str(tmp_path),
    )
    app = create_app(settings=settings, engine=engine)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, tmp_path
    dispose_test_engine(engine)
