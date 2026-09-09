"""Sprint 1 item 4 — reference data the frontends were hardcoding."""

from decimal import Decimal

from .conftest import bearer, create_client_record, create_company, signup


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


# ── GET /vat-treatment ─────────────────────────────────────────────────────
#
# The rule existed in core/rules/vat.py from the beginning and no route called
# it, so every invoice line shipped "S". These pin the three answers a Belgian
# seller can get, and the fact that the endpoint advises rather than decides.


async def _pair(client, headers, **client_overrides):
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"], **client_overrides)
    return company, record


async def _treatment(client, headers, company, record, **params):
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"/vat-treatment?company_id={company['id']}&client_id={record['id']}"
    response = await client.get(f"{url}&{query}" if query else url, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


async def test_a_belgian_customer_is_billed_belgian_vat(client):
    headers = bearer(await signup(client))
    company, record = await _pair(client, headers)

    body = await _treatment(client, headers, company, record)

    assert body["category"] == "S"
    assert Decimal(str(body["rate"])) == Decimal("21")
    assert body["legal_mention"] is None
    assert body["reason"] == "vat.reason.domestic"


async def test_an_intra_eu_business_is_reverse_charged(client):
    headers = bearer(await signup(client))
    company, record = await _pair(
        client, headers, name="Dutch BV", country_code="NL", vat_number="NL123456789B01"
    )

    body = await _treatment(client, headers, company, record)

    assert body["category"] == "AE"
    assert Decimal(str(body["rate"])) == Decimal("0")
    # Mandatory: an autoliquidation invoice without the article reference is
    # not compliant, and the seller carries the VAT if it is challenged.
    assert "51" in body["legal_mention"]
    assert body["reason"] == "vat.reason.intra_eu_b2b"


async def test_intra_eu_goods_cite_article_39bis_not_51(client):
    """`VATCategory.INTRA_EU`, its four-language mention and its compliance
    check all existed; nothing could reach them until `supply_kind` did."""
    headers = bearer(await signup(client))
    company, record = await _pair(
        client, headers, name="Dutch BV", country_code="NL", vat_number="NL123456789B01"
    )

    body = await _treatment(client, headers, company, record, supply_kind="goods")

    assert body["category"] == "K"
    assert Decimal(str(body["rate"])) == Decimal("0")
    assert "39bis" in body["legal_mention"]
    assert body["reason"] == "vat.reason.intra_eu_goods"

    # Same client, same call, services: the other article.
    services = await _treatment(
        client, headers, company, record, supply_kind="services"
    )
    assert services["category"] == "AE"
    assert "51" in services["legal_mention"]


async def test_an_intra_eu_consumer_still_pays_belgian_vat(client):
    """No VAT number, no reverse charge — the seller charges its own rate."""
    headers = bearer(await signup(client))
    company, record = await _pair(
        client, headers, name="Dutch person", country_code="NL", vat_number=None
    )

    body = await _treatment(client, headers, company, record)

    assert body["category"] == "S"
    assert body["reason"] == "vat.reason.domestic"


async def test_a_customer_outside_the_eu_is_an_export(client):
    headers = bearer(await signup(client))
    company, record = await _pair(
        client, headers, name="US Inc", country_code="US", vat_number=None
    )

    body = await _treatment(client, headers, company, record)

    assert body["category"] == "G"
    assert Decimal(str(body["rate"])) == Decimal("0")
    assert "39" in body["legal_mention"]
    assert body["reason"] == "vat.reason.outside_eu"


async def test_the_mention_follows_the_company_language(client):
    headers = bearer(await signup(client))
    company, record = await _pair(
        client, headers, name="Dutch BV", country_code="NL", vat_number="NL123456789B01"
    )

    default = await _treatment(client, headers, company, record)
    assert default["legal_mention"].startswith("Autoliquidation")

    # Explicit lang wins over the company default.
    dutch = await _treatment(client, headers, company, record, lang="nl")
    assert dutch["legal_mention"].startswith("BTW verlegd")


async def test_vat_treatment_requires_authentication(client):
    assert (await client.get("/vat-treatment?company_id=x&client_id=y")).status_code == 401
