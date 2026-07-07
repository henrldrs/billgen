"""Belgium-focused identifier validation — VAT, IBAN, BIC.

Pure and framework-free. Ported from the approved FinanceFlow demo
(`shared/src/validation.ts`). Every validator returns the canonical form on
success or ``None`` on failure, so callers can both check and normalize in one
step. Used by the Peppol export gate (`core.services.peppol_validation`) and by
`core.rules.belgian_peppol` for endpoint derivation.

Standards:
  - Belgian VAT (BTW/TVA): "BE" + 10 digits, mod-97 control
    (digits 1..8 mod 97 == 97 - digits 9..10). 9-digit legacy form is padded
    with a leading "0".
  - IBAN: ISO 13616, mod-97 == 1, per-country length table.
  - BIC / SWIFT: ISO 9362, 8 or 11 alphanumerics (AAAA-CC-LL[-BBB]).
  - Country code: ISO 3166-1 alpha-2.
"""

from __future__ import annotations

import re

# ISO 3166-1 alpha-2 codes for parties this app is likely to invoice.
ISO_COUNTRY_CODES: frozenset[str] = frozenset(
    {
        "BE", "NL", "FR", "DE", "LU", "ES", "IT", "PT", "IE", "AT",
        "PL", "GB", "US", "CA", "SE", "DK", "FI", "NO", "CH",
    }
)

# Country -> IBAN length. Restricted to countries we expect to invoice.
IBAN_LENGTHS: dict[str, int] = {
    "BE": 16, "NL": 18, "FR": 27, "DE": 22, "LU": 20, "ES": 24, "IT": 27,
    "PT": 25, "IE": 22, "AT": 20, "PL": 28, "GB": 22, "SE": 24, "DK": 18,
    "FI": 18, "NO": 15, "CH": 21,
}

_SEPARATORS = re.compile(r"[\s.\-_/]")
_NON_DIGIT = re.compile(r"\D")
_BIC_SHAPE = re.compile(r"^[A-Z0-9]{8}([A-Z0-9]{3})?$")
_BIC_STRICT = re.compile(r"^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$")


def is_iso_country_code(code: str | None) -> bool:
    return bool(code) and code in ISO_COUNTRY_CODES


def canonicalize_vat(raw: str | None, country: str) -> str:
    """Normalize a VAT number to the canonical ``<COUNTRY><digits>`` form.

    Belgian numbers become ``BE`` + 10 digits (9-digit legacy form gets a
    leading ``0``); other countries keep their cleaned value, prefixed with the
    country code if absent. Returns ``""`` for empty input.
    """
    cleaned = _SEPARATORS.sub("", (raw or "")).upper()
    if not cleaned:
        return ""
    if country == "BE":
        digits = _NON_DIGIT.sub("", cleaned.removeprefix("BE"))
        if len(digits) == 9:
            return f"BE0{digits}"
        if len(digits) == 10:
            return f"BE{digits}"
        return cleaned if cleaned.startswith("BE") else f"BE{digits}"
    return cleaned if cleaned.startswith(country) else f"{country}{cleaned}"


def validate_belgian_vat(raw: str | None) -> str | None:
    """Belgian VAT (BE + 10 digits, mod-97 control). Canonical form or ``None``."""
    canonical = canonicalize_vat(raw, "BE")
    if not re.fullmatch(r"BE\d{10}", canonical):
        return None
    digits = canonical[2:]
    base = int(digits[:8])
    ctrl = int(digits[8:10])
    return canonical if (97 - (base % 97)) == ctrl else None


def validate_iban(raw: str | None) -> str | None:
    """ISO 13616 IBAN (mod-97 == 1, per-country length). Cleaned form or ``None``."""
    cleaned = re.sub(r"\s+", "", (raw or "")).upper()
    if not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]+", cleaned):
        return None
    expected_len = IBAN_LENGTHS.get(cleaned[:2])
    if expected_len is not None and len(cleaned) != expected_len:
        return None
    # Move the first 4 chars to the end, map letters A=10..Z=35, mod-97 == 1.
    rearranged = cleaned[4:] + cleaned[:4]
    remainder = 0
    for ch in rearranged:
        value = ord(ch) - 55 if "A" <= ch <= "Z" else int(ch)
        remainder = (remainder * (100 if value >= 10 else 10) + value) % 97
    return cleaned if remainder == 1 else None


def validate_bic(raw: str | None) -> str | None:
    """ISO 9362 BIC (8 or 11 alphanumerics, position-aware). Cleaned form or ``None``."""
    cleaned = re.sub(r"\s+", "", (raw or "")).upper()
    if not _BIC_SHAPE.fullmatch(cleaned) or not _BIC_STRICT.fullmatch(cleaned):
        return None
    return cleaned
