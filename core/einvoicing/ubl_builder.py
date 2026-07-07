"""Peppol BIS Billing 3.0 / EN 16931 UBL 2.1 invoice XML.

Stdlib ElementTree only — deterministic output, no native dependencies.

Profile: standard **Peppol BIS Billing 3.0** for every seller (validated against
OpenPeppol UBL Invoice 2026.5 / BIS Billing 3.0.21). BE sellers additionally carry
the Belgian elements that BIS accepts — an OGM-VCS structured payment communication
in ``PaymentMeans/PaymentID`` and the KBO enterprise number as
``PartyLegalEntity/CompanyID`` (scheme 0208). The EN 16931 tax engine (Decimal math,
per-line categories, multi-rate ``TaxSubtotal`` grouping, document-level discounts)
is layered underneath.

Note: the older ``UBL.BE:1.0.0.20180214`` customization (with its
``AdditionalDocumentReference`` markers and BTCC ``cbc:Name`` codes) was dropped —
it fails Peppol BIS validation (PEPPOL-EN16931-R004) on the CustomizationID and is a
Mercurius/B2G-era profile, not what the B2B Peppol network validates today.

A document-level discount on a mixed-VAT-rate invoice is split **per VAT
category** (one ``AllowanceCharge`` each), as EN 16931 / the UBL.BE schematron
require; the parts are quantized to sum exactly to the document allowance total.
"""

from decimal import Decimal
from xml.etree import ElementTree as ET

from ..models import Client, Company, Currency, Invoice, VATCategory
from ..rules import (
    discount_amount,
    peppol_endpoint,
    quantize,
    structured_communication,
)

NS_INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
NS_CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
NS_CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

# Standard Peppol BIS Billing 3.0 specification identifier (PEPPOL-EN16931-R004).
CUSTOMIZATION_ID_BIS = (
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


def _legal_company_id(company: Company) -> str | None:
    """KBO/CBE enterprise number (10 digits) for a BE supplier's
    PartyLegalEntity/CompanyID schemeID=0208, or None."""
    if company.country_code.upper() != "BE":
        return None
    raw = company.registration_number or company.vat_number
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    return digits.zfill(10) if digits else None


def _tax_category(
    parent: ET.Element, *, tag: str = "TaxCategory", category_id: str, rate: Decimal,
    btcc: str | None, exemption_reason: str | None,
) -> None:
    """Emit a tax category (cac:TaxCategory or cac:ClassifiedTaxCategory) in
    EN 16931 child order: ID, Name (BTCC), Percent, TaxExemptionReason, TaxScheme."""
    category = _cac(parent, tag)
    _cbc(category, "ID", category_id)
    if btcc is not None:
        _cbc(category, "Name", btcc)
    _cbc(category, "Percent", str(rate))
    if exemption_reason:
        _cbc(category, "TaxExemptionReason", exemption_reason)
    scheme = _cac(category, "TaxScheme")
    _cbc(scheme, "ID", "VAT")


def _party(parent: ET.Element, tag: str, *, name: str, vat_number: str | None,
           street: str | None, city: str | None, postal_code: str | None,
           country_code: str, endpoint: tuple[str, str] | None,
           email: str | None, legal_company_id: str | None) -> None:
    wrapper = _cac(parent, tag)
    party = _cac(wrapper, "Party")

    # cbc:EndpointID must be the first Party child per the UBL element sequence.
    if endpoint is not None:
        scheme_id, value = endpoint
        _cbc(party, "EndpointID", value, schemeID=scheme_id)

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
    if legal_company_id is not None:
        _cbc(legal, "CompanyID", legal_company_id, schemeID="0208")

    if email:
        contact = _cac(party, "Contact")
        _cbc(contact, "ElectronicMail", email)


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
    # A BE seller adds the Belgian elements BIS accepts (structured comm, KBO id).
    is_be = company.country_code.upper() == "BE"

    root = ET.Element(ET.QName(NS_INVOICE, "Invoice"))

    _cbc(root, "CustomizationID", CUSTOMIZATION_ID_BIS)
    _cbc(root, "ProfileID", PROFILE_ID)
    _cbc(root, "ID", invoice.reference)
    _cbc(root, "IssueDate", invoice.issue_date.isoformat())
    if invoice.due_date:
        _cbc(root, "DueDate", invoice.due_date.isoformat())
    _cbc(root, "InvoiceTypeCode", "380")
    if invoice.comments:
        _cbc(root, "Note", invoice.comments)
    _cbc(root, "DocumentCurrencyCode", cur.value)
    # BT-10 BuyerReference: the invoice's own reference (a real accounting ref),
    # not the buyer's name.
    _cbc(root, "BuyerReference", invoice.reference)

    _party(
        root, "AccountingSupplierParty",
        name=company.legal_name or company.name,
        vat_number=company.vat_number,
        street=company.address_line1, city=company.city,
        postal_code=company.postal_code, country_code=company.country_code,
        endpoint=peppol_endpoint(
            company.country_code, company.vat_number, company.registration_number
        ),
        email=company.email, legal_company_id=_legal_company_id(company),
    )
    _party(
        root, "AccountingCustomerParty",
        name=client.name,
        vat_number=client.vat_number,
        street=client.address_line1, city=client.city,
        postal_code=client.postal_code, country_code=client.country_code,
        endpoint=peppol_endpoint(client.country_code, client.vat_number),
        email=client.email, legal_company_id=None,
    )

    if company.iban:
        means = _cac(root, "PaymentMeans")
        _cbc(means, "PaymentMeansCode", "30")  # credit transfer
        if is_be:
            # OGM-VCS structured communication, before PayeeFinancialAccount.
            _cbc(means, "PaymentID", structured_communication(invoice.reference))
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

    # A document-level discount must be split *per VAT category* on a mixed-rate
    # invoice: EN 16931 (and the UBL.BE schematron) require each document-level
    # AllowanceCharge to carry the VAT category it reduces, and the per-category
    # taxable amounts (below) already net out their share. `net_pre - allocated`
    # is exactly the discount each line absorbed; grouped by (category, rate) and
    # summed it reconstructs the allowance per category (and sums to doc_allowance).
    doc_allowance_by_group: dict[tuple[VATCategory, Decimal], Decimal] = {}
    if doc_allowance > 0:
        for line, net_pre, net_alloc in zip(
            invoice.lines, nets_pre_doc_discount, allocated_nets, strict=True
        ):
            key = (line.vat.category, line.vat.rate)
            doc_allowance_by_group[key] = (
                doc_allowance_by_group.get(key, Decimal(0)) + (net_pre - net_alloc)
            )

    # Quantize each group's amount so the parts sum *exactly* to the quantized
    # document allowance (largest group absorbs the sub-cent residual) — keeps
    # BR-CO-11 (AllowanceTotalAmount == Σ document allowance amounts) exact.
    emitted_allowance = Decimal(0)
    if doc_allowance_by_group:
        doc_allowance_q = quantize(doc_allowance, cur)
        group_items = [
            (key, quantize(amount, cur)) for key, amount in doc_allowance_by_group.items()
        ]
        residual = doc_allowance_q - sum((q for _, q in group_items), Decimal(0))
        if residual != 0:
            biggest = max(range(len(group_items)), key=lambda i: group_items[i][1])
            key, q = group_items[biggest]
            group_items[biggest] = (key, q + residual)

        reason = (
            invoice.invoice_discount.reason if invoice.invoice_discount else None
        ) or "Discount"
        for (category, rate), amount in group_items:
            if amount <= 0:
                continue
            emitted_allowance += amount
            allowance = _cac(root, "AllowanceCharge")
            _cbc(allowance, "ChargeIndicator", "false")
            _cbc(allowance, "AllowanceChargeReason", reason)
            _amount(allowance, "Amount", amount, cur)
            _tax_category(
                allowance, category_id=category.value, rate=rate,
                btcc=None,
                exemption_reason=None,
            )

    # Tax subtotals grouped by (category, rate) over allocated nets.
    groups: dict[tuple[VATCategory, Decimal], dict[str, Decimal]] = {}
    for line, net in zip(invoice.lines, allocated_nets, strict=True):
        key = (line.vat.category, line.vat.rate)
        group = groups.setdefault(key, {"taxable": Decimal(0), "tax": Decimal(0)})
        group["taxable"] += net
        group["tax"] += net * line.vat.rate / Decimal(100)

    total_tax = sum((g["tax"] for g in groups.values()), Decimal(0))
    tax_total = _cac(root, "TaxTotal")
    _amount(tax_total, "TaxAmount", total_tax, cur)
    for (category, rate), group in groups.items():
        subtotal = _cac(tax_total, "TaxSubtotal")
        _amount(subtotal, "TaxableAmount", group["taxable"], cur)
        _amount(subtotal, "TaxAmount", group["tax"], cur)
        _tax_category(
            subtotal, category_id=category.value, rate=rate,
            btcc=None,
            exemption_reason=_EXEMPTION_REASONS.get(category.value),
        )

    line_extension_total = sum(nets_pre_doc_discount, Decimal(0))
    tax_exclusive = line_extension_total - doc_allowance
    totals = _cac(root, "LegalMonetaryTotal")
    _amount(totals, "LineExtensionAmount", line_extension_total, cur)
    _amount(totals, "TaxExclusiveAmount", tax_exclusive, cur)
    _amount(totals, "TaxInclusiveAmount", tax_exclusive + total_tax, cur)
    if emitted_allowance > 0:
        _amount(totals, "AllowanceTotalAmount", emitted_allowance, cur)
    _amount(totals, "PayableAmount", tax_exclusive + total_tax, cur)

    for line, net_pre in zip(invoice.lines, nets_pre_doc_discount, strict=True):
        ubl_line = _cac(root, "InvoiceLine")
        _cbc(ubl_line, "ID", str(line.line_number))
        _cbc(ubl_line, "InvoicedQuantity", str(line.quantity), unitCode="C62")
        _amount(ubl_line, "LineExtensionAmount", net_pre, cur)
        item = _cac(ubl_line, "Item")
        _cbc(item, "Name", line.description[:100])
        _tax_category(
            item, tag="ClassifiedTaxCategory",
            category_id=line.vat.category.value, rate=line.vat.rate,
            btcc=None,
            exemption_reason=None,
        )
        price = _cac(ubl_line, "Price")
        _amount(price, "PriceAmount", line.unit_price, cur)

    ET.indent(root)
    return ET.tostring(root, encoding="unicode", xml_declaration=True)
