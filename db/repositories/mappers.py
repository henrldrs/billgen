"""Row <-> domain-model conversion.

Simple aggregates map 1:1 by field name (`row_kwargs` / `to_domain`). Invoices and
credit notes flatten their nested VAT/discount value objects into columns and are
mapped by hand.
"""

from decimal import Decimal
from enum import Enum
from typing import Any, TypeVar

from pydantic import BaseModel

from core.models import CreditNote, CreditNoteLine, Invoice, InvoiceLine
from db.models import CreditNoteLineRow, CreditNoteRow, InvoiceLineRow, InvoiceRow

M = TypeVar("M", bound=BaseModel)


def row_kwargs(model: BaseModel, *, exclude: set[str] | None = None) -> dict[str, Any]:
    data = model.model_dump(mode="python", exclude=exclude)
    return {k: (v.value if isinstance(v, Enum) else v) for k, v in data.items()}


def to_domain(model_cls: type[M], row: Any) -> M:
    return model_cls.model_validate(row, from_attributes=True)


def _discount_columns(discount: Any, prefix: str) -> dict[str, Any]:
    if discount is None:
        return {f"{prefix}_type": None, f"{prefix}_value": None, f"{prefix}_reason": None}
    return {
        f"{prefix}_type": discount.type.value,
        f"{prefix}_value": discount.value,
        f"{prefix}_reason": discount.reason,
    }


def _discount_dict(
    type_: str | None, value: Decimal | None, reason: str | None
) -> dict[str, Any] | None:
    if type_ is None:
        return None
    return {"type": type_, "value": value, "reason": reason}


def invoice_to_row(invoice: Invoice) -> InvoiceRow:
    return InvoiceRow(
        id=invoice.id,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        organization_id=invoice.organization_id,
        company_id=invoice.company_id,
        client_id=invoice.client_id,
        reference=invoice.reference,
        sequence_global=invoice.sequence_global,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency.value,
        comments=invoice.comments,
        payment_terms=invoice.payment_terms,
        pdf_template=invoice.pdf_template,
        subtotal_ht=invoice.subtotal_ht,
        total_discount=invoice.total_discount,
        total_vat=invoice.total_vat,
        total_ttc=invoice.total_ttc,
        status=invoice.status.value,
        voided_at=invoice.voided_at,
        voided_reason=invoice.voided_reason,
        voided_by_credit_note_id=invoice.voided_by_credit_note_id,
        **_discount_columns(invoice.invoice_discount, "invoice_discount"),
        lines=[_invoice_line_to_row(invoice, line) for line in invoice.lines],
    )


def _invoice_line_to_row(invoice: Invoice, line: InvoiceLine) -> InvoiceLineRow:
    return InvoiceLineRow(
        organization_id=invoice.organization_id,
        line_number=line.line_number,
        description=line.description,
        quantity=line.quantity,
        unit_price=line.unit_price,
        product_id=line.product_id,
        vat_category=line.vat.category.value,
        vat_rate=line.vat.rate,
        vat_legal_mention=line.vat.legal_mention,
        **_discount_columns(line.discount, "discount"),
    )


def row_to_invoice(row: InvoiceRow) -> Invoice:
    return Invoice.model_validate(
        {
            "id": row.id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "organization_id": row.organization_id,
            "company_id": row.company_id,
            "client_id": row.client_id,
            "reference": row.reference,
            "sequence_global": row.sequence_global,
            "issue_date": row.issue_date,
            "due_date": row.due_date,
            "currency": row.currency,
            "lines": [
                {
                    "line_number": line.line_number,
                    "description": line.description,
                    "quantity": line.quantity,
                    "unit_price": line.unit_price,
                    "product_id": line.product_id,
                    "vat": {
                        "category": line.vat_category,
                        "rate": line.vat_rate,
                        "legal_mention": line.vat_legal_mention,
                    },
                    "discount": _discount_dict(
                        line.discount_type, line.discount_value, line.discount_reason
                    ),
                }
                for line in row.lines
            ],
            "invoice_discount": _discount_dict(
                row.invoice_discount_type,
                row.invoice_discount_value,
                row.invoice_discount_reason,
            ),
            "comments": row.comments,
            "payment_terms": row.payment_terms,
            "pdf_template": row.pdf_template,
            "subtotal_ht": row.subtotal_ht,
            "total_discount": row.total_discount,
            "total_vat": row.total_vat,
            "total_ttc": row.total_ttc,
            "status": row.status,
            "voided_at": row.voided_at,
            "voided_reason": row.voided_reason,
            "voided_by_credit_note_id": row.voided_by_credit_note_id,
        }
    )


def credit_note_to_row(credit_note: CreditNote) -> CreditNoteRow:
    return CreditNoteRow(
        id=credit_note.id,
        created_at=credit_note.created_at,
        updated_at=credit_note.updated_at,
        organization_id=credit_note.organization_id,
        company_id=credit_note.company_id,
        client_id=credit_note.client_id,
        invoice_id=credit_note.invoice_id,
        reference=credit_note.reference,
        sequence_global=credit_note.sequence_global,
        issue_date=credit_note.issue_date,
        reason=credit_note.reason,
        currency=credit_note.currency.value,
        comments=credit_note.comments,
        pdf_template=credit_note.pdf_template,
        subtotal_ht=credit_note.subtotal_ht,
        total_vat=credit_note.total_vat,
        total_ttc=credit_note.total_ttc,
        lines=[_credit_note_line_to_row(credit_note, line) for line in credit_note.lines],
    )


def _credit_note_line_to_row(credit_note: CreditNote, line: CreditNoteLine) -> CreditNoteLineRow:
    return CreditNoteLineRow(
        organization_id=credit_note.organization_id,
        line_number=line.line_number,
        description=line.description,
        quantity=line.quantity,
        unit_price=line.unit_price,
        product_id=line.product_id,
        vat_category=line.vat.category.value,
        vat_rate=line.vat.rate,
        vat_legal_mention=line.vat.legal_mention,
    )


def row_to_credit_note(row: CreditNoteRow) -> CreditNote:
    return CreditNote.model_validate(
        {
            "id": row.id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "organization_id": row.organization_id,
            "company_id": row.company_id,
            "client_id": row.client_id,
            "invoice_id": row.invoice_id,
            "reference": row.reference,
            "sequence_global": row.sequence_global,
            "issue_date": row.issue_date,
            "reason": row.reason,
            "currency": row.currency,
            "lines": [
                {
                    "line_number": line.line_number,
                    "description": line.description,
                    "quantity": line.quantity,
                    "unit_price": line.unit_price,
                    "product_id": line.product_id,
                    "vat": {
                        "category": line.vat_category,
                        "rate": line.vat_rate,
                        "legal_mention": line.vat_legal_mention,
                    },
                }
                for line in row.lines
            ],
            "comments": row.comments,
            "pdf_template": row.pdf_template,
            "subtotal_ht": row.subtotal_ht,
            "total_vat": row.total_vat,
            "total_ttc": row.total_ttc,
        }
    )
