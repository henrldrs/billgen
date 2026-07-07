from decimal import Decimal
from xml.etree import ElementTree as ET

import pytest

from core.einvoicing.ubl_builder import CUSTOMIZATION_ID_BIS, NS_CAC, NS_CBC
from core.models import (
    Client,
    Discount,
    DiscountType,
    InvoiceLine,
    VATCategory,
    VATRate,
)
from core.services import InvoiceService, PeppolService, PeppolValidationError
from core.tenancy import organization_context

from .conftest import ISSUE_DATE, make_lines


def _issue_invoice(env, lines=None):
    return InvoiceService(env.uow_factory).create(
        company_id=env.company.id, client_id=env.client.id,
        lines=lines or make_lines(), issue_date=ISSUE_DATE,
    )


def test_generated_ubl_core_fields(env):
    invoice = _issue_invoice(env)
    xml = PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    root = ET.fromstring(xml)

    assert root.findtext(f"{{{NS_CBC}}}ID") == invoice.reference
    assert root.findtext(f"{{{NS_CBC}}}DocumentCurrencyCode") == "EUR"
    assert root.findtext(f"{{{NS_CBC}}}IssueDate") == "2026-07-04"
    assert root.findtext(f"{{{NS_CBC}}}InvoiceTypeCode") == "380"

    supplier_name = root.find(
        f"{{{NS_CAC}}}AccountingSupplierParty/{{{NS_CAC}}}Party/"
        f"{{{NS_CAC}}}PartyName/{{{NS_CBC}}}Name"
    )
    assert supplier_name is not None and supplier_name.text == "Acme Consulting SPRL"

    customer_name = root.find(
        f"{{{NS_CAC}}}AccountingCustomerParty/{{{NS_CAC}}}Party/"
        f"{{{NS_CAC}}}PartyName/{{{NS_CBC}}}Name"
    )
    assert customer_name is not None and customer_name.text == "Big Corp"

    payable = root.find(
        f"{{{NS_CAC}}}LegalMonetaryTotal/{{{NS_CBC}}}PayableAmount"
    )
    assert payable is not None
    assert Decimal(payable.text) == Decimal("1512.50")
    assert payable.get("currencyID") == "EUR"

    lines = root.findall(f"{{{NS_CAC}}}InvoiceLine")
    assert len(lines) == 1

    iban = root.find(
        f"{{{NS_CAC}}}PaymentMeans/{{{NS_CAC}}}PayeeFinancialAccount/{{{NS_CBC}}}ID"
    )
    assert iban is not None and iban.text == "BE68539007547034"


def test_parties_have_peppol_endpoint_ids(env):
    """Peppol BIS 3.0 R010/R020: both parties need a cbc:EndpointID. Belgium uses
    EAS 0208 = the enterprise number (VAT digits, no 'BE' prefix)."""
    invoice = _issue_invoice(env)
    xml = PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    root = ET.fromstring(xml)

    supplier = root.find(
        f"{{{NS_CAC}}}AccountingSupplierParty/{{{NS_CAC}}}Party/{{{NS_CBC}}}EndpointID"
    )
    assert supplier is not None
    assert supplier.get("schemeID") == "0208"
    assert supplier.text == "0123456749"  # from BE0123456749

    customer = root.find(
        f"{{{NS_CAC}}}AccountingCustomerParty/{{{NS_CAC}}}Party/{{{NS_CBC}}}EndpointID"
    )
    assert customer is not None
    assert customer.get("schemeID") == "0208"
    assert customer.text == "9876543265"  # from BE9876543265


def test_belgian_elements_on_bis_profile(env):
    """BE seller → standard Peppol BIS 3.0 CustomizationID (no UBL.BE profile, no
    AdditionalDocumentReference markers, no BTCC cbc:Name), but retaining the
    Belgian elements BIS accepts: OGM-VCS structured communication, KBO legal id,
    contact, and BuyerReference = the invoice reference."""
    invoice = _issue_invoice(env)
    xml = PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    root = ET.fromstring(xml)

    # Standard BIS spec id (PEPPOL-EN16931-R004), and the UBL.BE markers are gone.
    assert root.findtext(f"{{{NS_CBC}}}CustomizationID") == CUSTOMIZATION_ID_BIS
    assert root.findall(f"{{{NS_CAC}}}AdditionalDocumentReference") == []

    # BuyerReference is the invoice reference, not the client name.
    assert root.findtext(f"{{{NS_CBC}}}BuyerReference") == invoice.reference

    # OGM-VCS structured communication in PaymentMeans/PaymentID (kept — valid BIS).
    payment_id = root.findtext(
        f"{{{NS_CAC}}}PaymentMeans/{{{NS_CBC}}}PaymentID"
    )
    assert payment_id is not None and payment_id.startswith("+++") and payment_id.endswith("+++")

    # Standard tax category: ID only, no BTCC cbc:Name.
    tax_cat = root.find(
        f"{{{NS_CAC}}}TaxTotal/{{{NS_CAC}}}TaxSubtotal/{{{NS_CAC}}}TaxCategory"
    )
    assert tax_cat.findtext(f"{{{NS_CBC}}}ID") == "S"
    assert tax_cat.findtext(f"{{{NS_CBC}}}Name") is None

    # Supplier KBO enterprise number as PartyLegalEntity/CompanyID schemeID=0208.
    legal_id = root.find(
        f"{{{NS_CAC}}}AccountingSupplierParty/{{{NS_CAC}}}Party/"
        f"{{{NS_CAC}}}PartyLegalEntity/{{{NS_CBC}}}CompanyID"
    )
    assert legal_id is not None and legal_id.get("schemeID") == "0208"
    assert legal_id.text == "0123456749"

    # Contact email on both parties.
    supplier_mail = root.findtext(
        f"{{{NS_CAC}}}AccountingSupplierParty/{{{NS_CAC}}}Party/"
        f"{{{NS_CAC}}}Contact/{{{NS_CBC}}}ElectronicMail"
    )
    assert supplier_mail == "billing@acme.be"


def test_gate_blocks_b2c_customer(env):
    """A customer with no VAT is B2C — Peppol export must be refused."""
    with organization_context(env.org.id):
        b2c = Client(
            organization_id=env.org.id, company_id=env.company.id,
            name="Walk-in", address_line1="Somewhere 1", country_code="BE",
        )
        with env.uow_factory() as uow:
            uow.clients.add(b2c)
            uow.commit()
    invoice = InvoiceService(env.uow_factory).create(
        company_id=env.company.id, client_id=b2c.id,
        lines=make_lines(), issue_date=ISSUE_DATE,
    )
    with pytest.raises(PeppolValidationError) as exc:
        PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    assert any(e.field == "client.vat" for e in exc.value.errors)


def test_gate_blocks_invalid_supplier_iban(env):
    """A malformed supplier IBAN blocks export with a field error."""
    with organization_context(env.org.id):
        with env.uow_factory() as uow:
            company = uow.companies.get(env.company.id)
            company.iban = "BE00000000000000"  # fails mod-97
            uow.companies.update(company)
            uow.commit()
    invoice = _issue_invoice(env)
    with pytest.raises(PeppolValidationError) as exc:
        PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    assert any(e.field == "company.iban" for e in exc.value.errors)


def test_reverse_charge_has_exemption_reason(env):
    lines = [
        InvoiceLine(
            line_number=1,
            description="Cross-border consulting",
            quantity=Decimal("1"),
            unit_price=Decimal("1000.00"),
            vat=VATRate(category=VATCategory.REVERSE_CHARGE, rate=Decimal("0")),
        )
    ]
    invoice = _issue_invoice(env, lines=lines)
    xml = PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    root = ET.fromstring(xml)

    category = root.find(
        f"{{{NS_CAC}}}TaxTotal/{{{NS_CAC}}}TaxSubtotal/{{{NS_CAC}}}TaxCategory"
    )
    assert category is not None
    assert category.findtext(f"{{{NS_CBC}}}ID") == "AE"
    assert category.findtext(f"{{{NS_CBC}}}TaxExemptionReason") == "Reverse charge"

    payable = root.find(f"{{{NS_CAC}}}LegalMonetaryTotal/{{{NS_CBC}}}PayableAmount")
    assert Decimal(payable.text) == Decimal("1000.00")  # zero VAT


def test_mixed_rate_document_discount_splits_per_category(env):
    """A document-level discount on a mixed-rate invoice must emit one
    AllowanceCharge per VAT category (EN 16931 / UBL.BE), each carrying its
    category, with the amounts summing exactly to AllowanceTotalAmount."""
    lines = [
        InvoiceLine(
            line_number=1, description="Consulting @21%",
            quantity=Decimal("1"), unit_price=Decimal("1000.00"),
            vat=VATRate(category=VATCategory.STANDARD, rate=Decimal("21")),
        ),
        InvoiceLine(
            line_number=2, description="Printed matter @6%",
            quantity=Decimal("1"), unit_price=Decimal("1000.00"),
            vat=VATRate(category=VATCategory.STANDARD, rate=Decimal("6")),
        ),
    ]
    invoice = InvoiceService(env.uow_factory).create(
        company_id=env.company.id, client_id=env.client.id,
        lines=lines, issue_date=ISSUE_DATE,
        invoice_discount=Discount(type=DiscountType.PERCENTAGE, value=Decimal("10")),
    )
    xml = PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    root = ET.fromstring(xml)

    allowances = root.findall(f"{{{NS_CAC}}}AllowanceCharge")
    assert len(allowances) == 2  # one per (category, rate), not pinned to the first

    by_rate = {
        a.find(
            f"{{{NS_CAC}}}TaxCategory/{{{NS_CBC}}}Percent"
        ).text: Decimal(a.findtext(f"{{{NS_CBC}}}Amount"))
        for a in allowances
    }
    # 10% off a 2000.00 base = 200.00, split 100/100 across the two equal lines.
    assert by_rate == {"21.00": Decimal("100.00"), "6.00": Decimal("100.00")}
    for a in allowances:
        assert a.findtext(f"{{{NS_CBC}}}ChargeIndicator") == "false"

    # BR-CO-11: AllowanceTotalAmount == Σ document allowance amounts.
    allowance_total = root.findtext(
        f"{{{NS_CAC}}}LegalMonetaryTotal/{{{NS_CBC}}}AllowanceTotalAmount"
    )
    assert Decimal(allowance_total) == sum(by_rate.values()) == Decimal("200.00")

    # Tax base nets out the discount: 900 @21% + 900 @6% -> VAT 189 + 54 = 243.
    tax_exclusive = root.findtext(
        f"{{{NS_CAC}}}LegalMonetaryTotal/{{{NS_CBC}}}TaxExclusiveAmount"
    )
    payable = root.findtext(
        f"{{{NS_CAC}}}LegalMonetaryTotal/{{{NS_CBC}}}PayableAmount"
    )
    assert Decimal(tax_exclusive) == Decimal("1800.00")
    assert Decimal(payable) == Decimal("2043.00")


def test_peppol_export_is_audited(env):
    invoice = _issue_invoice(env)
    PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    assert any(entry.action.value == "export_peppol" for entry in entries)
