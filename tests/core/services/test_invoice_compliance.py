"""`check_invoice_compliance` is pure — no DB, no org context — so it is tested
against plain models, the same way `test_company_validation` is.

The gate it feeds is tested separately in `test_invoice_service.py`: this file
answers "does the checker see it", that one answers "does issue() refuse".
"""

from datetime import date
from decimal import Decimal
from uuid import uuid4

from core.models import (
    Client,
    Company,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    VATCategory,
    VATRate,
)
from core.services import ComplianceSeverity, check_invoice_compliance

ORG = uuid4()
ISSUE_DATE = date(2026, 7, 4)


def make_company(**overrides) -> Company:
    payload = {
        "organization_id": ORG,
        "name": "Acme Consulting",
        "legal_name": "Acme Consulting SPRL",
        "vat_number": "BE0123456749",
        "address_line1": "Rue de la Loi 1",
        "postal_code": "1000",
        "city": "Bruxelles",
        "iban": "BE68539007547034",
        "bic": "GKCCBEBB",
    }
    payload.update(overrides)
    return Company(**payload)


def make_client(company_id, **overrides) -> Client:
    payload = {
        "organization_id": ORG,
        "company_id": company_id,
        "name": "Big Corp",
        "vat_number": "BE9876543265",
        "address_line1": "Grote Markt 5",
        "postal_code": "2000",
        "city": "Antwerpen",
    }
    payload.update(overrides)
    return Client(**payload)


def make_invoice(company_id, client_id, *, lines=None, **overrides) -> Invoice:
    payload = {
        "organization_id": ORG,
        "company_id": company_id,
        "client_id": client_id,
        "issue_date": ISSUE_DATE,
        "due_date": date(2026, 8, 3),
        "payment_terms": "30 jours net",
        "lines": lines
        if lines is not None
        else [
            InvoiceLine(
                line_number=1,
                description="Consulting — July",
                quantity=Decimal("10"),
                unit_price=Decimal("125.00"),
                vat=VATRate(rate=Decimal("21")),
            )
        ],
    }
    payload.update(overrides)
    return Invoice(**payload)


def compliance(*, company=None, client=None, invoice=None, **invoice_overrides):
    company = company or make_company()
    client = client if client is not None else make_client(company.id)
    invoice = invoice or make_invoice(company.id, client.id, **invoice_overrides)
    return check_invoice_compliance(invoice, company, client)


def fields(result, severity=ComplianceSeverity.BLOCKING) -> list[str]:
    return [f.field for f in result.findings if f.severity is severity]


def keys(result) -> list[str]:
    return [f.message_key for f in result.findings]


# ---- the happy path ---------------------------------------------------------


def test_a_complete_domestic_invoice_is_conforming_and_issuable():
    result = compliance()
    assert result.findings == []
    assert result.conforming is True
    assert result.issuable is True


def test_an_issued_invoice_is_conforming_but_not_issuable():
    """The two booleans have to stay apart: an issued invoice is a correct
    document that cannot be issued a second time, and a screen that conflates
    them offers "fix this" for something already done."""
    result = compliance(status=InvoiceStatus.ISSUED, reference="ACME-2026-0001")
    assert result.conforming is True
    assert result.issuable is False


# ---- the supplier -----------------------------------------------------------


def test_a_company_without_a_vat_number_blocks():
    result = compliance(company=make_company(vat_number=None))
    assert "company.vat_number" in fields(result)
    assert "errSupplierVatMissing" in keys(result)
    assert result.conforming is False


def test_a_failed_mod97_is_reported_apart_from_a_missing_number():
    """Same field, different fix: one is "fill this in", the other is "you have
    a typo". A single key would make the screen say the wrong thing half the
    time."""
    result = compliance(company=make_company(vat_number="BE0123456740"))
    assert "errSupplierVatInvalid" in keys(result)


def test_a_company_with_no_city_blocks_on_its_address():
    result = compliance(company=make_company(city=None))
    assert "company.address" in fields(result)


def test_every_blocking_supplier_finding_cites_its_article():
    result = compliance(company=make_company(vat_number=None, city=None))
    blocking = [f for f in result.findings if f.severity is ComplianceSeverity.BLOCKING]
    assert blocking, "the fixture must actually produce blocking findings"
    assert all(f.legal_basis for f in blocking)


def test_a_missing_iban_is_advisory_only():
    """Nobody can pay it, and it is still a valid invoice. Refusing here would
    be the product inventing a rule."""
    result = compliance(company=make_company(iban=None))
    assert "company.iban" in fields(result, ComplianceSeverity.ADVISORY)
    assert result.conforming is True
    assert result.issuable is True


def test_a_malformed_bic_is_advisory():
    result = compliance(company=make_company(bic="NOTABIC"))
    assert "warnSupplierBicInvalid" in keys(result)
    assert result.conforming is True


# ---- the customer -----------------------------------------------------------


def test_a_business_client_without_a_vat_number_blocks():
    company = make_company()
    result = compliance(company=company, client=make_client(company.id, vat_number=None))
    assert "client.vat_number" in fields(result)
    assert "errCustomerVatMissing" in keys(result)


def test_a_private_individual_needs_no_vat_number():
    """B2C is a legitimate invoice, not an incomplete one."""
    company = make_company()
    client = make_client(company.id, vat_number=None, is_business=False)
    result = compliance(company=company, client=client)
    assert result.conforming is True


def test_a_client_without_an_address_blocks():
    company = make_company()
    result = compliance(company=company, client=make_client(company.id, address_line1=None))
    assert "client.address" in fields(result)


# ---- the lines --------------------------------------------------------------


def test_an_invoice_with_no_lines_blocks():
    result = compliance(lines=[])
    assert "lines" in fields(result)


def test_a_reverse_charged_line_taxed_at_21_percent_blocks():
    """The document would state that the customer owes the tax and then charge
    them the tax. Both halves print; a reader cannot tell which is the error."""
    company = make_company()
    client = make_client(company.id, country_code="NL", vat_number="NL123456789B01")
    lines = [
        InvoiceLine(
            line_number=1,
            description="Consulting",
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
            vat=VATRate(category=VATCategory.REVERSE_CHARGE, rate=Decimal("21")),
        )
    ]
    result = compliance(company=company, client=client, invoice=make_invoice(
        company.id, client.id, lines=lines
    ))
    assert "errZeroRatedLineTaxed" in keys(result)
    assert "line.1.vat" in fields(result)


def test_reverse_charge_to_a_belgian_client_blocks():
    company = make_company()
    client = make_client(company.id)  # BE
    lines = [
        InvoiceLine(
            line_number=1,
            description="Consulting",
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
            vat=VATRate(category=VATCategory.REVERSE_CHARGE, rate=Decimal("0")),
        )
    ]
    result = compliance(
        company=company, client=client, invoice=make_invoice(company.id, client.id, lines=lines)
    )
    assert "errReverseChargeDomestic" in keys(result)


def test_a_shifted_line_demands_the_customer_vat_number():
    company = make_company()
    client = make_client(company.id, country_code="NL", vat_number=None, is_business=False)
    lines = [
        InvoiceLine(
            line_number=1,
            description="Consulting",
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
            vat=VATRate(category=VATCategory.REVERSE_CHARGE, rate=Decimal("0")),
        )
    ]
    result = compliance(
        company=company, client=client, invoice=make_invoice(company.id, client.id, lines=lines)
    )
    # is_business is False, so the ordinary B2C exemption would have let this
    # through — the shifted line is what makes the number mandatory.
    assert "errCustomerVatRequiredForShift" in keys(result)


def test_intra_eu_to_a_non_eu_country_blocks():
    company = make_company()
    client = make_client(company.id, country_code="US", vat_number=None, is_business=False)
    lines = [
        InvoiceLine(
            line_number=1,
            description="Goods",
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
            vat=VATRate(category=VATCategory.INTRA_EU, rate=Decimal("0")),
        )
    ]
    result = compliance(
        company=company, client=client, invoice=make_invoice(company.id, client.id, lines=lines)
    )
    assert "errIntraEuOutsideEu" in keys(result)


def test_belgian_vat_charged_to_an_eu_business_is_advisory_not_blocking():
    """Usually the reverse-charge default not having been taken, and genuinely
    correct for some services — so it is reported and not refused."""
    company = make_company()
    client = make_client(company.id, country_code="NL", vat_number="NL123456789B01")
    result = compliance(company=company, client=client)
    assert "warnDomesticVatToEuBusiness" in keys(result)
    assert result.conforming is True


def test_an_exempting_mention_exists_for_every_zero_rated_category():
    """The mention is the sentence that makes a zero-rated invoice lawful. This
    fails loudly if a category is ever added to the enum without one, rather
    than shipping a silent zero."""
    company = make_company()
    client = make_client(company.id, country_code="US", vat_number=None, is_business=False)
    for category in (VATCategory.EXEMPT, VATCategory.REVERSE_CHARGE, VATCategory.EXPORT):
        lines = [
            InvoiceLine(
                line_number=1,
                description="Service",
                quantity=Decimal("1"),
                unit_price=Decimal("100.00"),
                vat=VATRate(category=category, rate=Decimal("0")),
            )
        ]
        result = compliance(
            company=company,
            client=client,
            invoice=make_invoice(company.id, client.id, lines=lines),
        )
        assert "errMissingLegalMention" not in keys(result), category


# ---- the document -----------------------------------------------------------


def test_a_draft_without_a_due_date_is_advised_not_refused():
    result = compliance(due_date=None)
    assert "warnNoDueDate" in keys(result)
    assert result.conforming is True


def test_a_due_date_before_the_issue_date_blocks():
    result = compliance(due_date=date(2026, 7, 3))
    assert "invoice.due_date" in fields(result)
    assert "errDueBeforeIssue" in keys(result)


def test_missing_payment_terms_are_advisory():
    result = compliance(payment_terms=None)
    assert "warnNoPaymentTerms" in keys(result)
    assert result.conforming is True
