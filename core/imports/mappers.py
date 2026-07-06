"""Translate legacy `FinanceFlow BillGen` records into BillGen domain models.

The legacy app stored free-text countries ("Belgium"), title-case enums
("Fixed", "Active"), single-line addresses, and template ids "A"/"B"/"C". These
mappers normalize those into the domain's ISO codes and enums. Anything that
can't be mapped raises ``MappingError`` with a human reason, which the import
service turns into a per-row issue rather than failing the whole run.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from ..models import BillingType, Client, Company, Currency, Product, ProductStatus


class MappingError(ValueError):
    """A single source row could not be mapped (bad name, negative price, …)."""


# Legacy free-text country -> ISO 3166-1 alpha-2. Keys are lowercased.
_COUNTRY_TO_ISO: dict[str, str] = {
    "belgium": "BE", "belgique": "BE", "belgië": "BE", "belgie": "BE",
    "netherlands": "NL", "nederland": "NL", "pays-bas": "NL",
    "france": "FR",
    "germany": "DE", "deutschland": "DE", "allemagne": "DE",
    "luxembourg": "LU",
    "spain": "ES", "españa": "ES", "espagne": "ES",
    "italy": "IT", "italia": "IT", "italie": "IT",
    "portugal": "PT",
    "ireland": "IE", "irlande": "IE",
    "austria": "AT", "autriche": "AT",
    "poland": "PL", "pologne": "PL",
    "united kingdom": "GB", "uk": "GB", "great britain": "GB", "royaume-uni": "GB",
    "usa": "US", "united states": "US", "united states of america": "US", "états-unis": "US",
    "canada": "CA",
    "sweden": "SE", "suède": "SE",
    "denmark": "DK", "danemark": "DK",
    "finland": "FI", "finlande": "FI",
    "norway": "NO", "norvège": "NO",
    "switzerland": "CH", "suisse": "CH",
}

_LANGUAGE_TO_CODE: dict[str, str] = {
    "en": "en", "english": "en", "anglais": "en",
    "fr": "fr", "french": "fr", "français": "fr", "francais": "fr",
    "nl": "nl", "dutch": "nl", "nederlands": "nl", "néerlandais": "nl",
    "es": "es", "spanish": "es", "español": "es", "espagnol": "es",
}

# Legacy template ids A=French, B=English, C=Dutch -> nearest domain template.
_TEMPLATE_TO_DOMAIN: dict[str, str] = {
    "a": "fr_standard", "b": "fr_standard", "c": "nl_minimal"}
_VALID_TEMPLATES = {"fr_standard", "fr_detailed", "nl_minimal", "credit_note"}

_BILLING_TYPE: dict[str, BillingType] = {
    "hourly": BillingType.HOURLY,
    "fixed": BillingType.FIXED,
    "daily": BillingType.DAILY,
    "unit": BillingType.UNIT,
    "recurring": BillingType.RECURRING,
}

_PRODUCT_STATUS: dict[str, ProductStatus] = {
    "active": ProductStatus.ACTIVE,
    "archived": ProductStatus.ARCHIVED,
    "draft": ProductStatus.DRAFT,
}


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _clean_trunc(value: Any, length: int) -> str | None:
    text = _clean(value)
    return text[:length] if text else None


_ISO_CODE_LENGTH = 2


def country_code(raw: Any, default: str = "BE") -> str:
    text = _clean(raw)
    if not text:
        return default
    if len(text) == _ISO_CODE_LENGTH and text.isalpha():
        return text.upper()
    return _COUNTRY_TO_ISO.get(text.lower(), default)


def language_code(raw: Any, default: str = "fr") -> str:
    text = _clean(raw)
    if not text:
        return default
    return _LANGUAGE_TO_CODE.get(text.lower(), default)


def currency(raw: Any) -> Currency:
    text = _clean(raw)
    if text:
        try:
            return Currency(text.upper())
        except ValueError:
            pass
    return Currency.EUR


def pdf_template(raw: Any) -> str:
    text = _clean(raw)
    if not text:
        return "fr_standard"
    if text in _VALID_TEMPLATES:
        return text
    return _TEMPLATE_TO_DOMAIN.get(text.lower(), "fr_standard")


def _decimal(raw: Any) -> Decimal:
    if raw is None or raw == "":
        return Decimal("0")
    try:
        return Decimal(str(raw))
    except (InvalidOperation, ValueError):
        raise MappingError(f"'{raw}' is not a valid amount") from None


def map_company(raw: dict[str, Any], organization_id: UUID) -> Company:
    name = _clean(raw.get("name"))
    if not name:
        raise MappingError("company has no name")
    return Company(
        organization_id=organization_id,
        name=name[:200],
        legal_name=name[:200],
        vat_number=_clean_trunc(raw.get("vat"), 32),
        email=_clean(raw.get("email")),
        phone=_clean(raw.get("phone")),
        address_line1=_clean(raw.get("address")),
        iban=_clean_trunc(raw.get("iban"), 34),
        bic=_clean_trunc(raw.get("bic"), 11),
        default_currency=currency(raw.get("currency")),
        default_language=language_code(raw.get("language")),
        default_pdf_template=pdf_template(raw.get("defaultTemplate")),
        invoice_reference_prefix=(_clean(raw.get("prefix")) or "")[:8],
        country_code=country_code(raw.get("country")),
    )


def map_client(raw: dict[str, Any], organization_id: UUID, company_id: UUID) -> Client:
    name = _clean(raw.get("name"))
    if not name:
        raise MappingError("client has no name")
    vat = _clean(raw.get("vat"))
    return Client(
        organization_id=organization_id,
        company_id=company_id,
        name=name[:200],
        email=_clean(raw.get("email")),
        phone=_clean(raw.get("phone")),
        vat_number=_clean_trunc(vat, 32),
        address_line1=_clean(raw.get("address")),
        country_code=country_code(raw.get("country")),
        is_business=bool(vat),
    )


def map_product(raw: dict[str, Any], organization_id: UUID, company_id: UUID) -> Product:
    # In the legacy app a service's *name* is stored in `description`, and its
    # blurb in `shortDescription`.
    name = _clean(raw.get("description")) or _clean(raw.get("name"))
    if not name:
        raise MappingError("service has no name")
    price = _decimal(raw.get("price"))
    if price < 0:
        raise MappingError("service has a negative price")
    tags_raw = raw.get("tags")
    tags = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []
    billing = _BILLING_TYPE.get(str(raw.get("billingType") or "").lower(), BillingType.FIXED)
    status = _PRODUCT_STATUS.get(str(raw.get("status") or "").lower(), ProductStatus.ACTIVE)
    return Product(
        organization_id=organization_id,
        company_id=company_id,
        name=name[:200],
        description=_clean(raw.get("shortDescription")),
        category=_clean_trunc(raw.get("category"), 100),
        unit_price=price,
        currency=Currency.EUR,
        billing_type=billing,
        status=status,
        pipeline_stage=_clean(raw.get("pipeline")),
        tags=tags,
    )
