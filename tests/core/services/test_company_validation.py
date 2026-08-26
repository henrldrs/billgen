"""`validate_company_identifiers` is pure — no DB, no org context — so it is
tested against plain models rather than through the API."""

from uuid import uuid4

from core.models import Company
from core.services import validate_company_identifiers


def make_company(**overrides) -> Company:
    payload = {
        "organization_id": uuid4(),
        "name": "Acme Consulting",
        "vat_number": "BE0123456749",
        "address_line1": "Rue de la Loi 1",
        "postal_code": "1000",
        "city": "Bruxelles",
        "iban": "BE68539007547034",
        "bic": "GKCCBEBB",
    }
    payload.update(overrides)
    return Company(**payload)


def check(result, field: str):
    return next(c for c in result.checks if c.field == field)


def test_a_complete_belgian_company_is_peppol_ready():
    result = validate_company_identifiers(make_company())
    assert result.valid is True
    assert result.peppol_ready is True
    assert result.missing_for_peppol == []


def test_identifiers_come_back_normalized():
    result = validate_company_identifiers(
        make_company(vat_number="be 0123.456.749", iban="be68 5390 0754 7034", bic="gkccbebb")
    )
    assert result.valid is True
    assert check(result, "vat_number").normalized == "BE0123456749"
    assert check(result, "iban").normalized == "BE68539007547034"
    assert check(result, "bic").normalized == "GKCCBEBB"


def test_a_failed_checksum_is_reported_per_field():
    result = validate_company_identifiers(make_company(vat_number="BE0123456748"))
    assert result.valid is False
    assert result.peppol_ready is False
    assert check(result, "vat_number").message_key == "errSupplierVat"
    # One bad field does not contaminate the others.
    assert check(result, "iban").valid is True


def test_a_bad_iban_fails_even_when_the_vat_is_right():
    result = validate_company_identifiers(make_company(iban="BE68539007547035"))
    assert result.valid is False
    assert check(result, "iban").message_key == "errSupplierIban"


def test_an_empty_optional_field_is_not_an_error():
    """Blank means "not filled in yet", which is a settings-form state, not a
    validation failure. It still blocks Peppol readiness."""
    result = validate_company_identifiers(make_company(bic=None, iban=None))
    assert result.valid is True
    assert result.peppol_ready is False
    assert result.missing_for_peppol == ["iban"]
    assert check(result, "bic").valid is True


def test_missing_address_blocks_peppol_without_being_invalid():
    result = validate_company_identifiers(make_company(address_line1=None))
    assert result.valid is True
    assert result.peppol_ready is False
    assert result.missing_for_peppol == ["address_line1"]


def test_a_non_belgian_vat_is_checked_against_its_own_country():
    """The mod-97 check is Belgian. For another member state the rule is only
    that the number canonicalizes under that country's prefix."""
    result = validate_company_identifiers(
        make_company(country_code="NL", vat_number="NL123456789B01")
    )
    assert check(result, "vat_number").valid is True
    assert check(result, "country_code").normalized == "NL"
