"""Builds template contexts. All formatting happens here, in Python — the
Jinja2 templates stay logic-free presentation."""

import base64
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from ..models import Client, Company, CreditNote, Invoice, InvoiceStatus
from ..rules import invoice_totals, line_totals, mandatory_mentions_for_invoice
from ..utils import format_amount, format_date
from .registry import TemplateSpec

_ASSETS_DIR = Path(__file__).parent / "assets"

# Free-tier brand mark shown in the PDF footer (see build_*_context `branded`).
# Removed on paid plans once plan gating lands (Phase 10) — the seam is the
# `branded` flag threaded from PdfService.
_BRAND_LINE = {
    "fr": "Créé avec BillGen",
    "nl": "Gemaakt met BillGen",
    "en": "Made with BillGen",
    "es": "Creado con BillGen",
}


@lru_cache(maxsize=1)
def _brand_logo_data_uri() -> str | None:
    """The footer logo as a self-contained data: URI (PDF has no network).
    Cached — read once per process."""
    path = _ASSETS_DIR / "billgen_logo.png"
    if not path.is_file():
        return None
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"

# Draft/proforma watermark (ADR-0002): a draft has no gapless number and no VAT
# force, so its PDF must not read as a valid invoice.
_DRAFT_WATERMARK = {
    "fr": "CECI N'EST PAS UNE FACTURE VALIDE",
    "nl": "DIT IS GEEN GELDIGE FACTUUR",
    "en": "NOT A VALID INVOICE",
    "es": "NO ES UNA FACTURA VÁLIDA",
}

# Short label for the "N°" line of a draft (which has no number yet).
_DRAFT_LABEL = {"fr": "BROUILLON", "nl": "CONCEPT", "en": "DRAFT", "es": "BORRADOR"}


def _plain(value: Decimal) -> str:
    """Trailing-zero-free display: DB Numeric round-trips give 21.00 / 10.000000."""
    if value == value.to_integral_value():
        return str(int(value))
    return format(value.normalize(), "f")


def build_invoice_context(
    invoice: Invoice,
    company: Company,
    client: Client,
    spec: TemplateSpec,
    branded: bool = True,
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

    is_draft = invoice.status is InvoiceStatus.DRAFT
    watermark = _DRAFT_WATERMARK.get(lang, _DRAFT_WATERMARK["en"]) if is_draft else None
    # A draft has no reference yet — the "N°" line shows a short DRAFT label; the
    # big watermark + red note carry the "not a valid invoice" message.
    reference_display = invoice.reference or (
        _DRAFT_LABEL.get(lang, _DRAFT_LABEL["en"]) if is_draft else ""
    )

    return {
        "lang": lang,
        "doc_title": spec.doc_title,
        "company": company,
        "client": client,
        "invoice": invoice,
        "is_draft": is_draft,
        "watermark": watermark,
        "reference_display": reference_display,
        "branded": branded,
        "brand_line": _BRAND_LINE.get(lang, _BRAND_LINE["en"]),
        "brand_logo": _brand_logo_data_uri() if branded else None,
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
    branded: bool = True,
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
        "branded": branded,
        "brand_line": _BRAND_LINE.get(lang, _BRAND_LINE["en"]),
        "brand_logo": _brand_logo_data_uri() if branded else None,
        "issue_date_fmt": format_date(credit_note.issue_date, lang),
        "rows": rows,
        "totals": {
            "net_fmt": format_amount(credit_note.subtotal_ht, cur, lang),
            "vat_fmt": format_amount(credit_note.total_vat, cur, lang),
            "ttc_fmt": format_amount(credit_note.total_ttc, cur, lang),
        },
    }
