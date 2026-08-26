from collections.abc import Sequence
from dataclasses import dataclass, field
from decimal import ROUND_HALF_EVEN, Decimal

from ..models import CreditNoteLine, Currency, Discount, InvoiceLine, VATCategory
from .discounts import discount_amount

# A credit-note line is an invoice line without a per-line discount. Everything
# below reads only quantity/unit_price/vat/discount, so both fit.
AnyLine = InvoiceLine | CreditNoteLine

_ZERO = Decimal("0")


@dataclass(frozen=True)
class LineTotals:
    subtotal_ht: Decimal
    discount_amount: Decimal
    net_ht: Decimal
    vat_amount: Decimal
    total_ttc: Decimal


@dataclass(frozen=True)
class VatBucket:
    """Taxable base and VAT for one (category, rate) pair — the shape a VAT
    return needs, which `InvoiceTotals.vat_breakdown` (VAT only, keyed by rate
    alone) cannot express: reverse-charge and export lines are both 0%."""

    category: VATCategory
    rate: Decimal
    taxable_base: Decimal
    vat_amount: Decimal


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

    line_grosses, line_discs, invoice_disc, line_nets = _allocate(lines, invoice_discount)

    total_pre = sum(line_grosses, _ZERO) - sum(line_discs, _ZERO)
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


def _allocate(
    lines: Sequence[AnyLine],
    invoice_discount: Discount | None,
) -> tuple[list[Decimal], list[Decimal], Decimal, list[Decimal]]:
    """Per-line gross, per-line discount, the invoice-level discount, and the
    net each line carries after that discount is spread proportionally.

    Full precision throughout — callers quantize. Shared by `invoice_totals` and
    `vat_buckets` so the two can never disagree about a line's taxable base.
    """
    line_grosses: list[Decimal] = []
    line_discs: list[Decimal] = []
    for line in lines:
        gross = line.quantity * line.unit_price
        line_grosses.append(gross)
        line_discs.append(discount_amount(gross, getattr(line, "discount", None)))

    line_nets_pre = [g - d for g, d in zip(line_grosses, line_discs, strict=True)]
    total_pre = sum(line_nets_pre, _ZERO)

    invoice_disc = discount_amount(total_pre, invoice_discount)

    if total_pre > 0:
        shares = [n / total_pre for n in line_nets_pre]
    else:
        shares = [Decimal(1) / Decimal(len(lines))] * len(lines)
    line_nets = [n - (invoice_disc * s) for n, s in zip(line_nets_pre, shares, strict=True)]
    return line_grosses, line_discs, invoice_disc, line_nets


def vat_buckets(
    lines: Sequence[AnyLine],
    invoice_discount: Discount | None,
    currency: Currency,
) -> list[VatBucket]:
    """Taxable base and VAT per (category, rate), ordered for stable output."""
    if not lines:
        return []

    _, _, _, line_nets = _allocate(lines, invoice_discount)

    acc: dict[tuple[VATCategory, Decimal], tuple[Decimal, Decimal]] = {}
    for line, net in zip(lines, line_nets, strict=True):
        key = (line.vat.category, line.vat.rate)
        base, vat = acc.get(key, (_ZERO, _ZERO))
        acc[key] = (base + net, vat + (net * line.vat.rate) / Decimal(100))

    return [
        VatBucket(
            category=category,
            rate=rate,
            taxable_base=quantize(base, currency),
            vat_amount=quantize(vat, currency),
        )
        for (category, rate), (base, vat) in sorted(
            acc.items(), key=lambda item: (item[0][0].value, item[0][1])
        )
    ]
