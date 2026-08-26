from decimal import Decimal

from .conftest import bearer, create_client_record, create_company, signup


async def test_client_crud(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)

    record = await create_client_record(client, headers, company["id"])
    assert record["organization_id"] == alice["organization_id"]
    assert record["company_id"] == company["id"]

    listed = await client.get(
        "/clients", params={"company_id": company["id"]}, headers=headers
    )
    assert [c["name"] for c in listed.json()] == ["Big Corp"]

    fetched = await client.get(f"/clients/{record['id']}", headers=headers)
    assert fetched.status_code == 200

    patched = await client.patch(
        f"/clients/{record['id']}",
        json={"name": "Bigger Corp", "city": "Gent"},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Bigger Corp"
    assert patched.json()["city"] == "Gent"
    assert patched.json()["vat_number"] == "BE9876543265"  # untouched field survives


async def test_product_crud(client):
    alice = await signup(client)
    headers = bearer(alice)
    company = await create_company(client, headers)

    created = await client.post(
        "/products",
        json={
            "company_id": company["id"],
            "name": "Consulting hour",
            "unit_price": "125.00",
            "billing_type": "hourly",
            "default_vat_rate": "21.0",
            "tags": ["consulting", "senior"],
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    product = created.json()
    assert Decimal(str(product["unit_price"])) == Decimal("125.00")
    assert product["tags"] == ["consulting", "senior"]

    patched = await client.patch(
        f"/products/{product['id']}", json={"unit_price": "150.00"}, headers=headers
    )
    assert Decimal(str(patched.json()["unit_price"])) == Decimal("150.00")

    listed = await client.get(
        "/products", params={"company_id": company["id"]}, headers=headers
    )
    assert len(listed.json()) == 1


async def _make_product(client, headers, company_id, name, **overrides):
    payload = {"company_id": company_id, "name": name, "unit_price": "100.00"}
    payload.update(overrides)
    response = await client.post("/products", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


async def test_products_filter_by_status_and_billing_type(client):
    """Catalog's Services and Archived views were fetching everything and
    filtering in the browser."""
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    await _make_product(client, headers, company["id"], "Hour", billing_type="hourly")
    await _make_product(client, headers, company["id"], "Retainer", billing_type="recurring")
    await _make_product(
        client, headers, company["id"], "Old package", status="archived", billing_type="fixed"
    )

    async def names(**params):
        response = await client.get(
            "/products", params={"company_id": company["id"], **params}, headers=headers
        )
        assert response.status_code == 200, response.text
        return sorted(p["name"] for p in response.json())

    assert await names() == ["Hour", "Old package", "Retainer"]
    assert await names(status="active") == ["Hour", "Retainer"]
    assert await names(status="archived") == ["Old package"]
    assert await names(billing_type="hourly") == ["Hour"]
    assert await names(status="active", billing_type="recurring") == ["Retainer"]
    assert await names(status="archived", billing_type="hourly") == []


async def test_products_reject_an_unknown_filter_value(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    response = await client.get(
        "/products", params={"company_id": company["id"], "status": "retired"}, headers=headers
    )
    assert response.status_code == 422


async def test_clients_and_products_are_tenant_isolated(client):
    alice = await signup(client, email="alice@example.com", organization_name="Org A")
    bob = await signup(client, email="bob@example.com", organization_name="Org B")
    company = await create_company(client, bearer(alice))
    record = await create_client_record(client, bearer(alice), company["id"])

    bob_list = await client.get("/clients", headers=bearer(bob))
    assert bob_list.json() == []

    bob_get = await client.get(f"/clients/{record['id']}", headers=bearer(bob))
    assert bob_get.status_code == 404

    bob_patch = await client.patch(
        f"/clients/{record['id']}", json={"name": "Hijacked"}, headers=bearer(bob)
    )
    assert bob_patch.status_code == 404


async def test_client_for_unknown_company_404(client):
    alice = await signup(client)
    response = await client.post(
        "/clients",
        json={"company_id": "00000000-0000-0000-0000-000000000000", "name": "Ghost"},
        headers=bearer(alice),
    )
    assert response.status_code == 404
