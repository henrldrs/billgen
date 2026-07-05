from decimal import Decimal

from core.models import Discount, DiscountType
from core.rules import discount_amount


def test_none_returns_zero():
    assert discount_amount(Decimal("100"), None) == Decimal("0")


def test_percentage():
    disc = Discount(type=DiscountType.PERCENTAGE, value=Decimal("15"))
    assert discount_amount(Decimal("200"), disc) == Decimal("30")


def test_fixed_below_base():
    disc = Discount(type=DiscountType.FIXED, value=Decimal("20"))
    assert discount_amount(Decimal("100"), disc) == Decimal("20")


def test_fixed_capped_at_base():
    disc = Discount(type=DiscountType.FIXED, value=Decimal("500"))
    assert discount_amount(Decimal("100"), disc) == Decimal("100")


def test_zero_percentage():
    disc = Discount(type=DiscountType.PERCENTAGE, value=Decimal("0"))
    assert discount_amount(Decimal("100"), disc) == Decimal("0")
