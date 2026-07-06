import json

from .conftest import bearer, signup

BACKUP = {
    "app": "FinanceFlow BillGen",
    "schemaVersion": 1,
    "createdAt": "2026-01-02T10:00:00.000Z",
    "keys": {
        "billgen-companies": json.dumps([
            {"id": "company-1", "name": "Legacy Studio", "address": "Rue Haute 12",
             "vat": "BE0123456789", "prefix": "LS-", "language": "French",
             "defaultTemplate": "C", "currency": "EUR"}
        ]),
        "billgen-clients-company-1": json.dumps([
            {"id": "mc1", "companyId": "company-1", "name": "Acme Corp",
             "country": "USA", "vat": ""},
        ]),
        "billgen-services-company-1": json.dumps([
            {"id": "svc1", "companyId": "company-1", "description": "Consulting day",
             "price": 800, "billingType": "Daily", "status": "Active"},
        ]),
        "billgen-invoices-company-1": json.dumps([
            {"reference": "LS-AC012026", "clientId": "mc1", "total": 968},
        ]),
    },
}


async def test_preview_then_commit_flow(client):
    headers = bearer(await signup(client))

    preview = await client.post("/imports/legacy/preview", json=BACKUP, headers=headers)
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert body["dry_run"] is True
    assert body["companies"]["created"] == 1
    assert body["clients"]["created"] == 1
    assert body["products"]["created"] == 1
    assert body["invoices_detected"] == 1

    # Preview wrote nothing.
    companies = await client.get("/companies", headers=headers)
    assert companies.json() == []

    commit = await client.post("/imports/legacy/commit", json=BACKUP, headers=headers)
    assert commit.status_code == 200, commit.text
    assert commit.json()["dry_run"] is False

    companies = (await client.get("/companies", headers=headers)).json()
    assert [c["name"] for c in companies] == ["Legacy Studio"]
    company_id = companies[0]["id"]
    clients = (await client.get(f"/clients?company_id={company_id}", headers=headers)).json()
    assert clients[0]["country_code"] == "US"


async def test_import_requires_auth(client):
    resp = await client.post("/imports/legacy/preview", json=BACKUP)
    assert resp.status_code == 401


async def test_invalid_backup_returns_409(client):
    headers = bearer(await signup(client))
    resp = await client.post(
        "/imports/legacy/commit", json={"app": "Wrong", "keys": {}}, headers=headers
    )
    assert resp.status_code == 409


async def test_import_is_isolated_per_tenant(client):
    headers_a = bearer(await signup(client, email="a@example.com", organization_name="Org A"))
    headers_b = bearer(await signup(client, email="b@example.com", organization_name="Org B"))

    await client.post("/imports/legacy/commit", json=BACKUP, headers=headers_a)

    # Org B ran no import and must see none of Org A's data.
    companies_b = (await client.get("/companies", headers=headers_b)).json()
    assert companies_b == []
