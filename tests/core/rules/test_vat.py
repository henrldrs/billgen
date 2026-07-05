from decimal import Decimal

from core.models import VATCategory
from core.rules import build_rate, default_rate_for_belgium, pick_category


def test_domestic_be_be_is_standard():
    cat = pick_category(
        client_is_business=True,
        client_country="BE",
        client_has_vat_number=True,
        seller_country="BE",
    )
    assert cat is VATCategory.STANDARD


def test_intra_eu_b2b_with_vat_number_is_reverse_charge():
    cat = pick_category(
        client_is_business=True,
        client_country="FR",
        client_has_vat_number=True,
        seller_country="BE",
    )
    assert cat is VATCategory.REVERSE_CHARGE


def test_intra_eu_b2c_is_standard():
    cat = pick_category(
        client_is_business=False,
        client_country="FR",
        client_has_vat_number=False,
        seller_country="BE",
    )
    assert cat is VATCategory.STANDARD


def test_intra_eu_b2b_without_vat_number_is_standard():
    cat = pick_category(
        client_is_business=True,
        client_country="NL",
        client_has_vat_number=False,
        seller_country="BE",
    )
    assert cat is VATCategory.STANDARD


def test_non_eu_is_export():
    cat = pick_category(
        client_is_business=True,
        client_country="US",
        client_has_vat_number=False,
        seller_country="BE",
    )
    assert cat is VATCategory.EXPORT


def test_default_rate_for_belgium():
    assert default_rate_for_belgium(VATCategory.STANDARD) == Decimal("21")
    assert default_rate_for_belgium(VATCategory.REVERSE_CHARGE) == Decimal("0")
    assert default_rate_for_belgium(VATCategory.EXPORT) == Decimal("0")


def test_build_rate_belgium_standard():
    rate = build_rate(VATCategory.STANDARD, seller_country="BE")
    assert rate.category is VATCategory.STANDARD
    assert rate.rate == Decimal("21")


def test_build_rate_reverse_charge_is_zero():
    rate = build_rate(VATCategory.REVERSE_CHARGE)
    assert rate.rate == Decimal("0")
