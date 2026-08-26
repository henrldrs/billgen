"""Sprint 1 item 4 — reference data the frontends were hardcoding."""

from decimal import Decimal

from .conftest import bearer, signup


async def test_vat_rates_are_the_belgian_set(client):
    headers = bearer(await signup(client))

    response = await client.get("/vat-rates", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["country_code"] == "BE"
    assert [Decimal(str(r["rate"])) for r in body["rates"]] == [
        Decimal("0"),
        Decimal("6"),
        Decimal("12"),
        Decimal("21"),
    ]
    assert [r["is_default"] for r in body["rates"]] == [False, False, False, True]
    assert [r["label"] for r in body["rates"]] == ["0%", "6%", "12%", "21%"]


async def test_vat_categories_expose_the_en16931_codes(client):
    headers = bearer(await signup(client))

    body = (await client.get("/vat-rates", headers=headers)).json()

    codes = {c["code"] for c in body["categories"]}
    assert codes == {"S", "Z", "E", "AE", "K", "G", "O"}
    reverse_charge = next(c for c in body["categories"] if c["code"] == "AE")
    assert reverse_charge["name"] == "REVERSE_CHARGE"
    assert reverse_charge["label"] == "Reverse charge"


async def test_pdf_templates_match_the_registry(client):
    headers = bearer(await signup(client))

    response = await client.get("/pdf-templates", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["default_template"] == "fr_standard"
    by_id = {t["id"]: t for t in body["templates"]}
    assert set(by_id) == {"fr_standard", "fr_detailed", "nl_minimal", "credit_note"}
    assert by_id["nl_minimal"]["lang"] == "nl"
    assert by_id["nl_minimal"]["doc_title"] == "FACTUUR"
    # The Jinja filename is an internal detail, not part of the contract.
    assert "filename" not in by_id["nl_minimal"]


async def test_reference_data_requires_authentication(client):
    for path in ("/vat-rates", "/pdf-templates"):
        assert (await client.get(path)).status_code == 401


async def test_a_company_can_only_default_to_a_listed_template(client):
    """The two endpoints agree: what /pdf-templates lists is what PATCH accepts."""
    headers = bearer(await signup(client))
    company = (
        await client.post("/companies", json={"name": "Acme"}, headers=headers)
    ).json()
    listed = (await client.get("/pdf-templates", headers=headers)).json()["templates"]

    for template in listed:
        response = await client.patch(
            f"/companies/{company['id']}",
            json={"default_pdf_template": template["id"]},
            headers=headers,
        )
        assert response.status_code == 200, template["id"]
