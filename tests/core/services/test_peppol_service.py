from decimal import Decimal
from xml.etree import ElementTree as ET

from core.einvoicing.ubl_builder import NS_CAC, NS_CBC
from core.models import InvoiceLine, VATCategory, VATRate
from core.services import InvoiceService, PeppolService

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


def test_peppol_export_is_audited(env):
    invoice = _issue_invoice(env)
    PeppolService(env.uow_factory).generate_invoice_xml(invoice.id)
    with env.uow_factory() as uow:
        entries = uow.audit_log.list(target_type="invoice")
    assert any(entry.action.value == "export_peppol" for entry in entries)
