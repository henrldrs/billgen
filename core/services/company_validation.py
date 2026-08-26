"""Check a company's own identifiers, without needing an invoice.

`peppol_validation.validate_peppol_parties` already knows how to judge a
supplier, but it judges a supplier *and a customer together*, at export time,
and returns nothing when it passes. A settings form needs the other shape: per
field, is this one valid, what is its canonical form, and what is still missing
before this company could act as a Peppol supplier at all.

Pure: domain models in, dataclasses out. No I/O, no framework.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..models import Company
from ..rules import (
    canonicalize_vat,
    is_iso_country_code,
    validate_belgian_vat,
    validate_bic,
    validate_iban,
)


@dataclass(frozen=True)
class IdentifierCheck:
    field: str
    value: str | None
    valid: bool
    normalized: str | None = None
    message_key: str | None = None


@dataclass(frozen=True)
class CompanyValidation:
    """`valid` means every identifier that *was filled in* checks out — a blank
    optional field is not an error. `peppol_ready` is stricter: it also requires
    the fields the Peppol supplier gate demands to be present.

    Supplier side only. A Peppol export can still be refused because the
    *customer* fails the gate (a client with no VAT number is B2C, which Peppol
    must not carry), so this must never be rendered as "your invoices will be
    delivered".
    """

    company_id: object
    valid: bool
    peppol_ready: bool
    checks: list[IdentifierCheck] = field(default_factory=list)
    missing_for_peppol: list[str] = field(default_factory=list)


def _blank(value: str | None) -> bool:
    return not (value or "").strip()


def validate_company_identifiers(company: Company) -> CompanyValidation:
    country = (company.country_code or "BE").upper()
    checks: list[IdentifierCheck] = []

    country_ok = is_iso_country_code(country)
    checks.append(
        IdentifierCheck(
            field="country_code",
            value=company.country_code,
            valid=country_ok,
            normalized=country if country_ok else None,
            message_key=None if country_ok else "errSupplierCountry",
        )
    )

    if _blank(company.vat_number):
        checks.append(IdentifierCheck(field="vat_number", value=None, valid=True))
    else:
        if country == "BE":
            normalized = validate_belgian_vat(company.vat_number)
        else:
            normalized = canonicalize_vat(company.vat_number, country) or None
        checks.append(
            IdentifierCheck(
                field="vat_number",
                value=company.vat_number,
                valid=normalized is not None,
                normalized=normalized,
                message_key=None if normalized else "errSupplierVat",
            )
        )

    if _blank(company.iban):
        checks.append(IdentifierCheck(field="iban", value=None, valid=True))
    else:
        normalized = validate_iban(company.iban)
        checks.append(
            IdentifierCheck(
                field="iban",
                value=company.iban,
                valid=normalized is not None,
                normalized=normalized,
                message_key=None if normalized else "errSupplierIban",
            )
        )

    if _blank(company.bic):
        checks.append(IdentifierCheck(field="bic", value=None, valid=True))
    else:
        normalized = validate_bic(company.bic)
        checks.append(
            IdentifierCheck(
                field="bic",
                value=company.bic,
                valid=normalized is not None,
                normalized=normalized,
                message_key=None if normalized else "errSupplierBic",
            )
        )

    # What the supplier half of the Peppol gate requires to be *present*, on top
    # of every filled field being valid. Mirrors validate_peppol_parties.
    missing = [
        name
        for name, blank in (
            ("name", _blank(company.legal_name) and _blank(company.name)),
            ("address_line1", _blank(company.address_line1)),
            ("vat_number", _blank(company.vat_number)),
            ("iban", _blank(company.iban)),
        )
        if blank
    ]

    valid = all(check.valid for check in checks)
    return CompanyValidation(
        company_id=company.id,
        valid=valid,
        peppol_ready=valid and not missing,
        checks=checks,
        missing_for_peppol=missing,
    )
