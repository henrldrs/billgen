"""Peppol BIS Billing 3.0 / EN 16931 UBL 2.1 invoice XML.

Stdlib ElementTree only — deterministic output, no native dependencies.

Known simplification (documented, revisit before Peppol AP integration):
a document-level discount on a mixed-VAT-rate invoice is attached to the
first rate's tax category; strict EN 16931 wants it split per category.
"""

from decimal import Decimal
from xml.etree import ElementTree as ET

from ..models import Client, Company, Currency, Invoice, VATCategory
from ..rules import discount_amount, quantize

NS_INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
NS_CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
NS_CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

CUSTOMIZATION_ID = (
    "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0"
)
PROFILE_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"

ET.register_namespace("", NS_INVOICE)
ET.register_namespace("cac", NS_CAC)
ET.register_namespace("cbc", NS_CBC)

_EXEMPTION_REASONS: dict[str, str] = {
    VATCategory.REVERSE_CHARGE.value: "Reverse charge",
    VATCategory.INTRA_EU.value: "Intra-Community supply",
    VATCategory.EXPORT.value: "Export outside the EU",
    VATCategory.EXEMPT.value: "Exempt from VAT",
}


def _cbc(parent: ET.Element, tag: str, text: str, **attrs: str) -> ET.Element:
    el = ET.SubElement(parent, ET.QName(NS_CBC, tag), attrs)
    el.text = text
    return el


def _cac(parent: ET.Element, tag: str) -> ET.Element:
    return ET.SubElement(parent, ET.QName(NS_CAC, tag))


def _amount(parent: ET.Element, tag: str, value: Decimal, currency: Currency) -> ET.Element:
    return _cbc(parent, tag, str(quantize(value, currency)), currencyID=currency.value)


def _party(parent: ET.Element, tag: str, *, name: str, vat_number: str | None,
           street: str | None, city: str | None, postal_code: str | None,
           country_code: str) -> None:
    wrapper = _cac(parent, tag)
    party = _cac(wrapper, "Party")

    party_name = _cac(party, "PartyName")
    _cbc(party_name, "Name", name)

    address = _cac(party, "PostalAddress")
    if street:
        _cbc(address, "StreetName", street)
    if city:
        _cbc(address, "CityName", city)
    if postal_code:
        _cbc(address, "PostalZone", postal_code)
    country = _cac(address, "Country")
    _cbc(country, "IdentificationCode", country_code)

    if vat_number:
        tax_scheme_wrap = _cac(party, "PartyTaxScheme")
        _cbc(tax_scheme_wrap, "CompanyID", vat_number)
        scheme = _cac(tax_scheme_wrap, "TaxScheme")
        _cbc(scheme, "ID", "VAT")

    legal = _cac(party, "PartyLegalEntity")
    _cbc(legal, "RegistrationName", name)


def _allocated_line_nets(invoice: Invoice) -> tuple[list[Decimal], Decimal]:
    """Per-line net amounts after proportional document-discount allocation,
    plus the document-level allowance amount. Mirrors rules.currency_math."""
    nets_pre = [
        line.quantity * line.unit_price
        - discount_amount(line.quantity * line.unit_price, line.discount)
        for line in invoice.lines
    ]
    total_pre = sum(nets_pre, Decimal(0))
    doc_allowance = discount_amount(total_pre, invoice.invoice_discount)
    if doc_allowance == 0 or total_pre == 0:
        return nets_pre, doc_allowance
    return [n - doc_allowance * (n / total_pre) for n in nets_pre], doc_allowance


def build_invoice_ubl(invoice: Invoice, company: Company, client: Client) -> str:
    cur = invoice.currency
    root = ET.Element(ET.QName(NS_INVOICE, "Invoice"))

    _cbc(root, "CustomizationID", CUSTOMIZATION_ID)
    _cbc(root, "ProfileID", PROFILE_ID)
    _cbc(root, "ID", invoice.reference)
    _cbc(root, "IssueDate", invoice.issue_date.isoformat())
    if invoice.due_date:
        _cbc(root, "DueDate", invoice.due_date.isoformat())
    _cbc(root, "InvoiceTypeCode", "380")
    if invoice.comments:
        _cbc(root, "Note", invoice.comments)
    _cbc(root, "DocumentCurrencyCode", cur.value)
    _cbc(root, "BuyerReference", client.name)

    _party(
        root, "AccountingSupplierParty",
        name=company.legal_name or company.name,
        vat_number=company.vat_number,
        street=company.address_line1, city=company.city,
        postal_code=company.postal_code, country_code=company.country_code,
    )
    _party(
        root, "AccountingCustomerParty",
        name=client.name,
        vat_number=client.vat_number,
        street=client.address_line1, city=client.city,
        postal_code=client.postal_code, country_code=client.country_code,
    )

    if company.iban:
        means = _cac(root, "PaymentMeans")
        _cbc(means, "PaymentMeansCode", "30")  # credit transfer
        account = _cac(means, "PayeeFinancialAccount")
        _cbc(account, "ID", company.iban)
        if company.bic:
            branch = _cac(account, "FinancialInstitutionBranch")
            _cbc(branch, "ID", company.bic)

    if invoice.payment_terms:
        terms = _cac(root, "PaymentTerms")
        _cbc(terms, "Note", invoice.payment_terms)

    allocated_nets, doc_allowance = _allocated_line_nets(invoice)
    nets_pre_doc_discount = [
        line.quantity * line.unit_price
        - discount_amount(line.quantity * line.unit_price, line.discount)
        for line in invoice.lines
    ]

    if doc_allowance > 0 and invoice.lines:
        first_vat = invoice.lines[0].vat
        allowance = _cac(root, "AllowanceCharge")
        _cbc(allowance, "ChargeIndicator", "false")
        _cbc(
            allowance, "AllowanceChargeReason",
            (invoice.invoice_discount.reason if invoice.invoice_discount else None)
            or "Discount",
        )
        _amount(allowance, "Amount", doc_allowance, cur)
        category = _cac(allowance, "TaxCategory")
        _cbc(category, "ID", first_vat.category.value)
        _cbc(category, "Percent", str(first_vat.rate))
        scheme = _cac(category, "TaxScheme")
        _cbc(scheme, "ID", "VAT")

    # Tax subtotals grouped by (category, rate) over allocated nets.
    groups: dict[tuple[str, Decimal], dict[str, Decimal]] = {}
    for line, net in zip(invoice.lines, allocated_nets, strict=True):
        key = (line.vat.category.value, line.vat.rate)
        group = groups.setdefault(key, {"taxable": Decimal(0), "tax": Decimal(0)})
        group["taxable"] += net
        group["tax"] += net * line.vat.rate / Decimal(100)

    total_tax = sum((g["tax"] for g in groups.values()), Decimal(0))
    tax_total = _cac(root, "TaxTotal")
    _amount(tax_total, "TaxAmount", total_tax, cur)
    for (category_id, rate), group in groups.items():
        subtotal = _cac(tax_total, "TaxSubtotal")
        _amount(subtotal, "TaxableAmount", group["taxable"], cur)
        _amount(subtotal, "TaxAmount", group["tax"], cur)
        category = _cac(subtotal, "TaxCategory")
        _cbc(category, "ID", category_id)
        _cbc(category, "Percent", str(rate))
        reason = _EXEMPTION_REASONS.get(category_id)
        if reason:
            _cbc(category, "TaxExemptionReason", reason)
        scheme = _cac(category, "TaxScheme")
        _cbc(scheme, "ID", "VAT")

    line_extension_total = sum(nets_pre_doc_discount, Decimal(0))
    tax_exclusive = line_extension_total - doc_allowance
    totals = _cac(root, "LegalMonetaryTotal")
    _amount(totals, "LineExtensionAmount", line_extension_total, cur)
    _amount(totals, "TaxExclusiveAmount", tax_exclusive, cur)
    _amount(totals, "TaxInclusiveAmount", tax_exclusive + total_tax, cur)
    if doc_allowance > 0:
        _amount(totals, "AllowanceTotalAmount", doc_allowance, cur)
    _amount(totals, "PayableAmount", tax_exclusive + total_tax, cur)

    for line, net_pre in zip(invoice.lines, nets_pre_doc_discount, strict=True):
        ubl_line = _cac(root, "InvoiceLine")
        _cbc(ubl_line, "ID", str(line.line_number))
        _cbc(ubl_line, "InvoicedQuantity", str(line.quantity), unitCode="C62")
        _amount(ubl_line, "LineExtensionAmount", net_pre, cur)
        item = _cac(ubl_line, "Item")
        _cbc(item, "Name", line.description[:100])
        classified = _cac(item, "ClassifiedTaxCategory")
        _cbc(classified, "ID", line.vat.category.value)
        _cbc(classified, "Percent", str(line.vat.rate))
        scheme = _cac(classified, "TaxScheme")
        _cbc(scheme, "ID", "VAT")
        price = _cac(ubl_line, "Price")
        _amount(price, "PriceAmount", line.unit_price, cur)

    ET.indent(root)
    return ET.tostring(root, encoding="unicode", xml_declaration=True)
