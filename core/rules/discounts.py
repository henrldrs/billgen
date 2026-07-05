from decimal import Decimal

from ..models import Discount, DiscountType

_ZERO = Decimal("0")


def discount_amount(base: Decimal, discount: Discount | None) -> Decimal:
    """Currency amount deducted by `discount` from `base`. Not quantized.

    Fixed discounts are capped at `base` so the result is never negative.
    """
    if discount is None:
        return _ZERO
    if discount.type is DiscountType.PERCENTAGE:
        return (base * discount.value) / Decimal(100)
    return min(discount.value, base)
