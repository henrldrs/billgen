"""Light structural validation of generated UBL — presence of EN 16931 core
elements and internal totals consistency. Not a schematron replacement: full
BIS 3.0 validation happens against the Peppol test bench before AP integration."""

from decimal import Decimal
from xml.etree import ElementTree as ET

from .ubl_builder import NS_CAC, NS_CBC

_REQUIRED_PATHS = [
    f"{{{NS_CBC}}}CustomizationID",
    f"{{{NS_CBC}}}ProfileID",
    f"{{{NS_CBC}}}ID",
    f"{{{NS_CBC}}}IssueDate",
    f"{{{NS_CBC}}}InvoiceTypeCode",
    f"{{{NS_CBC}}}DocumentCurrencyCode",
    f"{{{NS_CAC}}}AccountingSupplierParty",
    f"{{{NS_CAC}}}AccountingCustomerParty",
    f"{{{NS_CAC}}}TaxTotal",
    f"{{{NS_CAC}}}LegalMonetaryTotal",
    f"{{{NS_CAC}}}InvoiceLine",
]


def validate_invoice_ubl(xml: str) -> list[str]:
    """Returns a list of problems; empty list means the document passed."""
    problems: list[str] = []
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        return [f"XML parse error: {exc}"]

    for path in _REQUIRED_PATHS:
        if root.find(path) is None:
            problems.append(f"Missing required element: {path.split('}')[-1]}")

    monetary = root.find(f"{{{NS_CAC}}}LegalMonetaryTotal")
    if monetary is not None:
        inclusive = monetary.findtext(f"{{{NS_CBC}}}TaxInclusiveAmount")
        payable = monetary.findtext(f"{{{NS_CBC}}}PayableAmount")
        if inclusive and payable and Decimal(inclusive) != Decimal(payable):
            problems.append("PayableAmount does not equal TaxInclusiveAmount")

    invoice_id = root.findtext(f"{{{NS_CBC}}}ID")
    if invoice_id is not None and not invoice_id.strip():
        problems.append("Invoice ID is empty")

    return problems
