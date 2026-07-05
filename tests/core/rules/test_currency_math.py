from decimal import Decimal

from core.models import Currency, Discount, DiscountType, InvoiceLine, VATRate
from core.rules import invoice_totals, line_totals, quantize


def _line(qty: str, price: str, rate: str, line_number: int = 1, discount: Discount | None = None):
    return InvoiceLine(
        line_number=line_number,
        description="Test line",
        quantity=Decimal(qty),
        unit_price=Decimal(price),
        vat=VATRate(rate=Decimal(rate)),
        discount=discount,
    )


def test_quantize_eur_two_decimals():
    assert quantize(Decimal("1.235"), Currency.EUR) == Decimal("1.24")
    assert quantize(Decimal("1.245"), Currency.EUR) == Decimal("1.24")  # banker: 4 is even


def test_quantize_jpy_zero_decimals():
    assert quantize(Decimal("1234.56"), Currency.JPY) == Decimal("1235")


def test_simple_line_21pct():
    totals = line_totals(_line("2", "100", "21"), Currency.EUR)
    assert totals.subtotal_ht == Decimal("200.00")
    assert totals.net_ht == Decimal("200.00")
    assert totals.vat_amount == Decimal("42.00")
    assert totals.total_ttc == Decimal("242.00")


def test_line_with_percentage_discount():
    disc = Discount(type=DiscountType.PERCENTAGE, value=Decimal("10"))
    totals = line_totals(_line("2", "100", "21", discount=disc), Currency.EUR)
    assert totals.subtotal_ht == Decimal("200.00")
    assert totals.discount_amount == Decimal("20.00")
    assert totals.net_ht == Decimal("180.00")
    assert totals.vat_amount == Decimal("37.80")
    assert totals.total_ttc == Decimal("217.80")


def test_line_with_fixed_discount_capped_at_base():
    disc = Discount(type=DiscountType.FIXED, value=Decimal("999"))
    totals = line_totals(_line("1", "50", "0", discount=disc), Currency.EUR)
    assert totals.discount_amount == Decimal("50.00")
    assert totals.net_ht == Decimal("0.00")


def test_invoice_mixed_rate_no_discount():
    lines = [_line("2", "100", "21", 1), _line("1", "50", "6", 2)]
    totals = invoice_totals(lines, None, Currency.EUR)
    assert totals.subtotal_ht == Decimal("250.00")
    assert totals.net_ht == Decimal("250.00")
    assert totals.total_vat == Decimal("45.00")  # 200*.21 + 50*.06 = 42 + 3
    assert totals.total_ttc == Decimal("295.00")
    assert totals.vat_breakdown == {
        Decimal("21"): Decimal("42.00"),
        Decimal("6"): Decimal("3.00"),
    }


def test_invoice_level_discount_proportionally_allocated():
    lines = [_line("2", "100", "21", 1), _line("1", "50", "6", 2)]
    invoice_disc = Discount(type=DiscountType.PERCENTAGE, value=Decimal("10"))
    totals = invoice_totals(lines, invoice_disc, Currency.EUR)
    # pre-invoice-discount net = 250; invoice discount = 25
    # Line 1 share = 200/250 = 0.8 -> takes 20 off -> net 180 -> VAT 37.80
    # Line 2 share = 50/250 = 0.2 -> takes 5 off  -> net 45  -> VAT 2.70
    assert totals.total_discount == Decimal("25.00")
    assert totals.net_ht == Decimal("225.00")
    assert totals.total_vat == Decimal("40.50")
    assert totals.total_ttc == Decimal("265.50")


def test_invoice_no_lines_returns_zeros():
    totals = invoice_totals([], None, Currency.EUR)
    assert totals.total_ttc == Decimal("0")
    assert totals.vat_breakdown == {}
