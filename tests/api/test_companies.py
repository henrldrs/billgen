"""B3 — the company was write-once until PATCH existed. These pin the six areas
that depended on it: identity, VAT/registration, address, bank, numbering
prefix, and PDF/language defaults."""

from .conftest import bearer, create_company, signup


async def test_get_company_by_id(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    response = await client.get(f"/companies/{company['id']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == company["id"]


async def test_patch_updates_only_the_fields_sent(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    response = await client.patch(
        f"/companies/{company['id']}",
        json={"vat_number": "BE0987654310", "city": "Gent"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["vat_number"] == "BE0987654310"
    assert body["city"] == "Gent"
    # Untouched fields survive.
    assert body["name"] == company["name"]
    assert body["iban"] == company["iban"]
    assert body["invoice_reference_prefix"] == company["invoice_reference_prefix"]


async def test_patch_covers_every_editable_area(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    changes = {
        "name": "Acme BV",
        "legal_name": "Acme Besloten Vennootschap",
        "registration_number": "0987.654.310",
        "email": "facturen@acme.be",
        "phone": "+32 9 123 45 67",
        "address_line1": "Korenmarkt 1",
        "address_line2": "bus 3",
        "postal_code": "9000",
        "city": "Gent",
        "country_code": "BE",
        "iban": "BE71096123456769",
        "bic": "GEBABEBB",
        "default_language": "nl",
        "default_pdf_template": "nl_minimal",
        "invoice_reference_prefix": "ACME24-",
    }
    response = await client.patch(
        f"/companies/{company['id']}", json=changes, headers=headers
    )
    assert response.status_code == 200, response.text
    body = response.json()
    for key, value in changes.items():
        assert body[key] == value, key

    # And it persisted, rather than only being echoed back.
    reread = await client.get(f"/companies/{company['id']}", headers=headers)
    assert reread.json() == body


async def test_patch_with_no_fields_is_a_no_op(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    response = await client.patch(f"/companies/{company['id']}", json={}, headers=headers)
    assert response.status_code == 200
    assert response.json() == company


async def test_patch_rejects_an_unknown_pdf_template(client):
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    response = await client.patch(
        f"/companies/{company['id']}",
        json={"default_pdf_template": "does_not_exist"},
        headers=headers,
    )
    assert response.status_code == 422


async def test_patch_rejects_a_null_on_a_non_nullable_field(client):
    """model_copy(update=...) would let this through; the router re-validates."""
    headers = bearer(await signup(client))
    company = await create_company(client, headers)

    response = await client.patch(
        f"/companies/{company['id']}", json={"country_code": None}, headers=headers
    )
    assert response.status_code == 422


async def test_company_patch_is_tenant_isolated(client):
    alice = await signup(client, email="alice@example.com", organization_name="Org A")
    bob = await signup(client, email="bob@example.com", organization_name="Org B")
    company = await create_company(client, bearer(alice))

    response = await client.patch(
        f"/companies/{company['id']}", json={"name": "Hijacked"}, headers=bearer(bob)
    )
    assert response.status_code == 404
