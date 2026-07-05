from decimal import Decimal
from xml.etree import ElementTree as ET

from core.einvoicing.ubl_builder import NS_CBC

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_invoice,
    invoice_payload,
    signup,
)


def _weasyprint_available() -> bool:
    try:
        import weasyprint  # noqa: F401, PLC0415

        return True
    except Exception:
        return False


async def _setup(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    return headers, company, record


async def test_preview_returns_totals_without_burning_sequence(client):
    headers, company, record = await _setup(client)

    preview = await client.post(
        "/invoices/preview",
        json={
            "lines": invoice_payload(company["id"], record["id"])["lines"],
            "currency": "EUR",
        },
        headers=headers,
    )
    assert preview.status_code == 200
    body = preview.json()
    assert Decimal(str(body["total_ttc"])) == Decimal("1512.50")
    assert Decimal(str(body["vat_breakdown"]["21"])) == Decimal("262.50")

    invoice = await create_invoice(client, headers, company["id"], record["id"])
    assert invoice["sequence_global"] == 1  # preview did not consume a number


async def test_create_invoice_full_shape(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    assert invoice["reference"] == "ACME-BC07012026"
    assert invoice["status"] == "issued"
    assert Decimal(str(invoice["subtotal_ht"])) == Decimal("1250.00")
    assert Decimal(str(invoice["total_vat"])) == Decimal("262.50")
    assert Decimal(str(invoice["total_ttc"])) == Decimal("1512.50")
    assert invoice["due_date"] == "2026-08-03"
    assert len(invoice["lines"]) == 1
    assert invoice["lines"][0]["line_number"] == 1

    audit = await client.get(
        "/activity", params={"target_type": "invoice"}, headers=headers
    )
    actions = [entry["action"] for entry in audit.json()]
    assert "create" in actions


async def test_list_filter_by_status_and_get(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    issued = await client.get(
        "/invoices",
        params={"company_id": company["id"], "status": "issued"},
        headers=headers,
    )
    assert len(issued.json()) == 1

    voided = await client.get(
        "/invoices",
        params={"company_id": company["id"], "status": "voided"},
        headers=headers,
    )
    assert voided.json() == []

    fetched = await client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert fetched.json()["reference"] == invoice["reference"]


async def test_void_and_double_void(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    voided = await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "duplicate"}, headers=headers
    )
    assert voided.status_code == 200
    assert voided.json()["status"] == "voided"
    assert voided.json()["voided_reason"] == "duplicate"

    again = await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "again"}, headers=headers
    )
    assert again.status_code == 409


async def test_unknown_client_404(client):
    headers, company, _ = await _setup(client)
    response = await client.post(
        "/invoices",
        json=invoice_payload(company["id"], "00000000-0000-0000-0000-000000000000"),
        headers=headers,
    )
    assert response.status_code == 404


async def test_invoice_html_endpoint(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    response = await client.get(f"/invoices/{invoice['id']}/html", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "FACTURE" in response.text
    assert invoice["reference"] in response.text


async def test_invoice_pdf_endpoint(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    response = await client.get(f"/invoices/{invoice['id']}/pdf", headers=headers)
    if _weasyprint_available():
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")
    else:
        assert response.status_code == 503


async def test_invoice_peppol_endpoint(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    response = await client.get(
        f"/invoices/{invoice['id']}/peppol.xml", headers=headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    root = ET.fromstring(response.text)
    assert root.findtext(f"{{{NS_CBC}}}ID") == invoice["reference"]

    audit = await client.get(
        "/activity", params={"target_type": "invoice"}, headers=headers
    )
    actions = [entry["action"] for entry in audit.json()]
    assert "export_peppol" in actions


async def test_invoices_are_tenant_isolated(client):
    headers, company, record = await _setup(client)
    invoice = await create_invoice(client, headers, company["id"], record["id"])

    bob = await signup(client, email="bob@example.com", organization_name="Org B")
    bob_get = await client.get(f"/invoices/{invoice['id']}", headers=bearer(bob))
    assert bob_get.status_code == 404

    bob_void = await client.post(
        f"/invoices/{invoice['id']}/void", json={"reason": "attack"}, headers=bearer(bob)
    )
    assert bob_void.status_code == 404
