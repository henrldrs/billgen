from decimal import Decimal

from ..models import SupplyKind, VATCategory, VATRate

BELGIAN_STANDARD_RATES: list[Decimal] = [
    Decimal("0"),
    Decimal("6"),
    Decimal("12"),
    Decimal("21"),
]

EU_MEMBER_STATES: frozenset[str] = frozenset(
    {
        "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
        "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
        "SI", "ES", "SE",
    }
)


def pick_category(
    *,
    client_is_business: bool,
    client_country: str,
    client_has_vat_number: bool,
    seller_country: str,
    supply_kind: SupplyKind = SupplyKind.SERVICES,
) -> VATCategory:
    """Given buyer/seller context, return the applicable EN 16931 VAT category.

    Rules (Belgian seller default):
      - Domestic (same country): STANDARD
      - Intra-EU B2B with a client VAT number: REVERSE_CHARGE for services
        (autoliquidation, Art. 51 §2), INTRA_EU for goods (exempt
        intra-Community supply, Art. 39bis)
      - Intra-EU B2C or B2B without VAT number: STANDARD (seller charges its own VAT)
      - Outside EU: EXPORT (zero-rated)

    `supply_kind` defaults to SERVICES, which is what the caller meant before
    the parameter existed — so an existing caller keeps the answer it had.
    """
    client_country = client_country.upper()
    seller_country = seller_country.upper()

    if client_country == seller_country:
        return VATCategory.STANDARD

    if client_country in EU_MEMBER_STATES:
        if client_is_business and client_has_vat_number:
            if supply_kind is SupplyKind.GOODS:
                return VATCategory.INTRA_EU
            return VATCategory.REVERSE_CHARGE
        return VATCategory.STANDARD

    return VATCategory.EXPORT


def default_rate_for_belgium(category: VATCategory) -> Decimal:
    """Default numeric rate for a Belgian seller by category."""
    if category is VATCategory.STANDARD:
        return Decimal("21")
    return Decimal("0")


def build_rate(category: VATCategory, *, seller_country: str = "BE") -> VATRate:
    """Convenience: produce a VATRate for a category using the seller country's defaults."""
    if seller_country.upper() == "BE":
        rate = default_rate_for_belgium(category)
    else:
        rate = Decimal("21") if category is VATCategory.STANDARD else Decimal("0")
    return VATRate(category=category, rate=rate)
