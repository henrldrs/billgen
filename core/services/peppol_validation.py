"""Pre-export Peppol validation gate.

Ported from the approved FinanceFlow demo (`validateSupplier` / `validateCustomer`
in `shared/src/validation.ts`). Runs before any UBL is built: it refuses to emit
XML for a supplier or customer with a missing/invalid VAT, IBAN, BIC, country,
address, or name, and treats a customer without a VAT number as **B2C** — which
Peppol (B2B/B2G) must not carry.

Pure: takes domain models, returns ``list[FieldError]`` (empty == passes). The
service layer turns a non-empty result into ``PeppolValidationError``.
"""

from __future__ import annotations

from ..models import Client, Company
from ..rules import (
    canonicalize_vat,
    is_iso_country_code,
    validate_belgian_vat,
    validate_bic,
    validate_iban,
)
from .errors import FieldError


def _valid_vat(vat: str | None, country: str) -> bool:
    if country == "BE":
        return validate_belgian_vat(vat) is not None
    return bool(canonicalize_vat(vat, country))


def validate_peppol_parties(company: Company, client: Client) -> list[FieldError]:
    """Validate supplier (company) and customer (client) for Peppol delivery."""
    errors: list[FieldError] = []

    # ── Supplier (your company) ──
    if not (company.legal_name or company.name or "").strip():
        errors.append(FieldError("company.name", "errSupplierName"))
    if not (company.address_line1 or "").strip():
        errors.append(FieldError("company.address", "errSupplierAddress"))

    supplier_country = (company.country_code or "BE").upper()
    if not is_iso_country_code(supplier_country):
        errors.append(FieldError("company.country", "errSupplierCountry"))
    elif not _valid_vat(company.vat_number, supplier_country):
        errors.append(FieldError("company.vat", "errSupplierVat"))

    if validate_iban(company.iban) is None:
        errors.append(FieldError("company.iban", "errSupplierIban"))
    if (company.bic or "").strip() and validate_bic(company.bic) is None:
        errors.append(FieldError("company.bic", "errSupplierBic"))

    # ── Customer (the client) ──
    if not (client.name or "").strip():
        errors.append(FieldError("client.name", "errCustomerName"))
    if not (client.address_line1 or "").strip():
        errors.append(FieldError("client.address", "errCustomerAddress"))

    customer_country = (client.country_code or "").upper()
    if not is_iso_country_code(customer_country):
        errors.append(FieldError("client.country", "errCustomerCountry"))

    if not (client.vat_number or "").strip():
        # No VAT → B2C. Peppol is B2B/B2G; block it (use the PDF path instead).
        errors.append(FieldError("client.vat", "errCustomerVatB2C"))
    elif is_iso_country_code(customer_country) and not _valid_vat(
        client.vat_number, customer_country
    ):
        errors.append(FieldError("client.vat", "errCustomerVat"))

    return errors
