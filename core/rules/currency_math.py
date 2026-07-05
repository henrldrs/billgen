from dataclasses import dataclass, field
from decimal import ROUND_HALF_EVEN, Decimal

from ..models import Currency, Discount, InvoiceLine
from .discounts import discount_amount

_ZERO = Decimal("0")


@dataclass(frozen=True)
class LineTotals:
    subtotal_ht: Decimal
    discount_amount: Decimal
    net_ht: Decimal
    vat_amount: Decimal
    total_ttc: Decimal


@dataclass(frozen=True)
class InvoiceTotals:
    subtotal_ht: Decimal
    total_discount: Decimal
    net_ht: Decimal
    total_vat: Decimal
    total_ttc: Decimal
    vat_breakdown: dict[Decimal, Decimal] = field(default_factory=dict)


def quantize(amount: Decimal, currency: Currency) -> Decimal:
    """Round to the currency's smallest unit using banker's rounding (ROUND_HALF_EVEN)."""
    if currency.decimals == 0:
        return amount.quantize(Decimal(1), rounding=ROUND_HALF_EVEN)
    exponent = Decimal(10) ** -currency.decimals
    return amount.quantize(exponent, rounding=ROUND_HALF_EVEN)


def line_totals(line: InvoiceLine, currency: Currency) -> LineTotals:
    gross = line.quantity * line.unit_price
    line_disc = discount_amount(gross, line.discount)
    net = gross - line_disc
    vat = (net * line.vat.rate) / Decimal(100)
    return LineTotals(
        subtotal_ht=quantize(gross, currency),
        discount_amount=quantize(line_disc, currency),
        net_ht=quantize(net, currency),
        vat_amount=quantize(vat, currency),
        total_ttc=quantize(net + vat, currency),
    )


def invoice_totals(
    lines: list[InvoiceLine],
    invoice_discount: Discount | None,
    currency: Currency,
) -> InvoiceTotals:
    """Aggregate line totals with proportional allocation of any invoice-level discount.

    All intermediate math runs at full precision; only the returned values are quantized.
    """
    if not lines:
        return InvoiceTotals(
            subtotal_ht=_ZERO,
            total_discount=_ZERO,
            net_ht=_ZERO,
            total_vat=_ZERO,
            total_ttc=_ZERO,
            vat_breakdown={},
        )

    line_grosses: list[Decimal] = []
    line_discs: list[Decimal] = []
    for line in lines:
        gross = line.quantity * line.unit_price
        line_grosses.append(gross)
        line_discs.append(discount_amount(gross, line.discount))

    line_nets_pre = [g - d for g, d in zip(line_grosses, line_discs, strict=True)]
    total_pre = sum(line_nets_pre, _ZERO)

    invoice_disc = discount_amount(total_pre, invoice_discount)

    if total_pre > 0:
        shares = [n / total_pre for n in line_nets_pre]
    else:
        shares = [Decimal(1) / Decimal(len(lines))] * len(lines)
    line_nets = [n - (invoice_disc * s) for n, s in zip(line_nets_pre, shares, strict=True)]

    total_vat = _ZERO
    breakdown: dict[Decimal, Decimal] = {}
    for line, net in zip(lines, line_nets, strict=True):
        line_vat = (net * line.vat.rate) / Decimal(100)
        total_vat += line_vat
        breakdown[line.vat.rate] = breakdown.get(line.vat.rate, _ZERO) + line_vat

    net_ht = total_pre - invoice_disc
    return InvoiceTotals(
        subtotal_ht=quantize(sum(line_grosses, _ZERO), currency),
        total_discount=quantize(sum(line_discs, _ZERO) + invoice_disc, currency),
        net_ht=quantize(net_ht, currency),
        total_vat=quantize(total_vat, currency),
        total_ttc=quantize(net_ht + total_vat, currency),
        vat_breakdown={rate: quantize(v, currency) for rate, v in breakdown.items()},
    )
