from decimal import Decimal

from core.models import VATCategory
from core.rules import (
    btcc_code,
    canonicalize_vat,
    peppol_endpoint,
    structured_communication,
    validate_belgian_vat,
    validate_bic,
    validate_iban,
)


def test_belgian_vat_mod97():
    assert validate_belgian_vat("BE0123456749") == "BE0123456749"
    assert validate_belgian_vat("BE 0123.456.749") == "BE0123456749"  # separators ok
    assert validate_belgian_vat("BE0123456789") is None  # wrong control digits
    assert validate_belgian_vat("NL123456789B01") is None  # not Belgian shape


def test_canonicalize_vat_pads_9_digits():
    assert canonicalize_vat("123456749", "BE") == "BE0123456749"
    assert canonicalize_vat("BE0123456749", "BE") == "BE0123456749"
    assert canonicalize_vat("fr 12345678901", "FR") == "FR12345678901"
    assert canonicalize_vat("", "BE") == ""


def test_iban_mod97():
    assert validate_iban("BE68 5390 0754 7034") == "BE68539007547034"
    assert validate_iban("BE00000000000000") is None  # fails mod-97
    assert validate_iban("BE6853900754703") is None  # wrong length for BE


def test_bic_iso9362():
    assert validate_bic("gkccbebb") == "GKCCBEBB"
    assert validate_bic("GKCCBEBB123") == "GKCCBEBB123"  # 11-char with branch
    assert validate_bic("1234BEBB") is None  # bank code must be letters
    assert validate_bic("GKCCBE") is None  # too short


def test_structured_communication_shape():
    comm = structured_communication("ACME-BC072026")
    assert comm.startswith("+++") and comm.endswith("+++")
    # +++DDD/DDDD/DDDXX+++
    body = comm.strip("+")
    assert len(body) == len("000/0072/02652")
    assert body.count("/") == 2


def test_btcc_codes():
    assert btcc_code(VATCategory.STANDARD, Decimal("21")) == "03"
    assert btcc_code(VATCategory.STANDARD, Decimal("6")) == "01"
    assert btcc_code(VATCategory.STANDARD, Decimal("12")) == "02"
    assert btcc_code(VATCategory.ZERO, Decimal("0")) == "00"
    assert btcc_code(VATCategory.REVERSE_CHARGE, Decimal("0")) == "45"


def test_peppol_endpoint_schemes():
    assert peppol_endpoint("BE", "BE0123456749", None) == ("0208", "0123456749")
    assert peppol_endpoint("BE", None, "0123456749") == ("0208", "0123456749")
    assert peppol_endpoint("FR", "FR12345678901", None) == ("9925", "FR12345678901")
    assert peppol_endpoint("BE", None, None) is None  # B2C: no identifier
