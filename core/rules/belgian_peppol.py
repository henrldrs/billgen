"""Belgian Peppol / UBL.BE helpers — pure, framework-free.

Ported from the approved FinanceFlow demo (`shared/src/validation.ts` and
`frontend/src/lib/peppol.ts`). These feed `core.einvoicing.ubl_builder`:
structured payment communications, the Belgian tax-category code that rides in
``cbc:Name``, and the Peppol electronic-address (EndpointID) derivation.
"""

from __future__ import annotations

from decimal import Decimal

from ..models import VATCategory
from .identifiers import canonicalize_vat


def structured_communication(seed: str) -> str:
    """Belgian OGM-VCS structured payment communication ``+++DDD/DDDD/DDDXX+++``.

    Digits are extracted from ``seed`` (e.g. the invoice reference), left-padded
    to 10, and given a mod-97 control (0 rendered as 97). Belgian banks reconcile
    payments carrying this reference automatically.
    """
    digits = "".join(ch for ch in seed if ch.isdigit()).rjust(10, "0")[-10:]
    ctrl = int(digits) % 97 or 97
    full = f"{digits}{ctrl:02d}"
    return f"+++{full[:3]}/{full[3:7]}/{full[7:12]}+++"


# Belgian Tax Category Code (BTCC / FOD Financiën) carried in cbc:Name alongside
# the EN 16931 letter code in cbc:ID. Reverse charge (autoliquidation) is 45.
_BTCC_BY_RATE: dict[int, str] = {0: "00", 6: "01", 12: "02", 21: "03"}


def btcc_code(category: VATCategory, rate: Decimal) -> str:
    """Belgian tax-category code for a ``(category, rate)`` pair.

    00 exempt/zero · 01 reduced 6% · 02 reduced 12% · 03 standard 21% ·
    45 reverse charge. Unknown rates fall back to 03 (the safe standard default).
    """
    if category is VATCategory.REVERSE_CHARGE:
        return "45"
    return _BTCC_BY_RATE.get(int(rate.to_integral_value()), "03")


def peppol_endpoint(
    country_code: str,
    vat_number: str | None,
    registration_number: str | None = None,
) -> tuple[str, str] | None:
    """``(schemeID, value)`` for ``cbc:EndpointID`` (BT-34 / BT-49), or ``None``.

    Locked defaults (from the approved demo):
      - Belgium: EAS ``0208`` = the CBE/KBO enterprise number, i.e. the 10 digits
        of the VAT number without the 'BE' prefix (or ``registration_number`` when
        given). The standard Belgian Peppol participant identifier.
      - Any other country with a VAT number: EAS ``9925`` = the canonical VAT.
      - No usable identifier: ``None`` (the party has no Peppol address; the export
        gate is responsible for blocking B2C / undeliverable invoices).
    """
    country = (country_code or "").upper()
    if country == "BE":
        raw = registration_number or vat_number
        digits = "".join(ch for ch in (raw or "") if ch.isdigit())
        if digits:
            return "0208", digits.zfill(10)
        return None
    canonical = canonicalize_vat(vat_number, country)
    if canonical:
        return "9925", canonical
    return None
