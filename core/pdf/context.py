"""Builds template contexts. All formatting happens here, in Python — the
Jinja2 templates stay logic-free presentation."""

from decimal import Decimal

from ..models import Client, Company, CreditNote, Invoice
from ..rules import invoice_totals, line_totals, mandatory_mentions_for_invoice
from ..utils import format_amount, format_date
from .registry import TemplateSpec


def _plain(value: Decimal) -> str:
    """Trailing-zero-free display: DB Numeric round-trips give 21.00 / 10.000000."""
    if value == value.to_integral_value():
        return str(int(value))
    return format(value.normalize(), "f")


def build_invoice_context(
    invoice: Invoice, company: Company, client: Client, spec: TemplateSpec
) -> dict:
    lang = spec.lang
    cur = invoice.currency

    rows = []
    for line in invoice.lines:
        lt = line_totals(line, cur)
        rows.append(
            {
                "line_number": line.line_number,
                "description": line.description,
                "quantity": _plain(line.quantity),
                "unit_price_fmt": format_amount(line.unit_price, cur, lang),
                "vat_rate": _plain(line.vat.rate),
                "discount_fmt": (
                    format_amount(lt.discount_amount, cur, lang)
                    if lt.discount_amount > 0
                    else None
                ),
                "net_fmt": format_amount(lt.net_ht, cur, lang),
            }
        )

    totals = invoice_totals(invoice.lines, invoice.invoice_discount, cur)
    vat_rows = [
        {"rate": _plain(rate), "amount_fmt": format_amount(amount, cur, lang)}
        for rate, amount in sorted(totals.vat_breakdown.items(), reverse=True)
    ]

    mentions: list[str] = []
    for category in {line.vat.category for line in invoice.lines}:
        mentions.extend(mandatory_mentions_for_invoice(category, lang))

    return {
        "lang": lang,
        "doc_title": spec.doc_title,
        "company": company,
        "client": client,
        "invoice": invoice,
        "issue_date_fmt": format_date(invoice.issue_date, lang),
        "due_date_fmt": format_date(invoice.due_date, lang) if invoice.due_date else None,
        "rows": rows,
        "totals": {
            "subtotal_fmt": format_amount(totals.subtotal_ht, cur, lang),
            "discount_fmt": (
                format_amount(totals.total_discount, cur, lang)
                if totals.total_discount > 0
                else None
            ),
            "net_fmt": format_amount(totals.net_ht, cur, lang),
            "vat_rows": vat_rows,
            "ttc_fmt": format_amount(totals.total_ttc, cur, lang),
        },
        "mentions": mentions,
    }


def build_credit_note_context(
    credit_note: CreditNote,
    company: Company,
    client: Client,
    original_invoice: Invoice,
    spec: TemplateSpec,
) -> dict:
    lang = spec.lang
    cur = credit_note.currency

    rows = [
        {
            "line_number": line.line_number,
            "description": line.description,
            "quantity": _plain(line.quantity),
            "unit_price_fmt": format_amount(line.unit_price, cur, lang),
            "vat_rate": _plain(line.vat.rate),
        }
        for line in credit_note.lines
    ]

    return {
        "lang": lang,
        "doc_title": spec.doc_title,
        "company": company,
        "client": client,
        "credit_note": credit_note,
        "original_reference": original_invoice.reference,
        "issue_date_fmt": format_date(credit_note.issue_date, lang),
        "rows": rows,
        "totals": {
            "net_fmt": format_amount(credit_note.subtotal_ht, cur, lang),
            "vat_fmt": format_amount(credit_note.total_vat, cur, lang),
            "ttc_fmt": format_amount(credit_note.total_ttc, cur, lang),
        },
    }
