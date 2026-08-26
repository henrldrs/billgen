"""DTOs for the read-only aggregations the screens need.

Kept out of `reports.py` because two of the three hang off `/clients/{id}`
rather than `/reports` — the grouping here is by what the payload *is*, not by
which router serves it.
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class StatusBucketResponse(BaseModel):
    status: str
    count: int
    total_ttc: Decimal


class InvoiceReportResponse(BaseModel):
    """Counts and money per **effective** status (Overdue is derived from the
    due date, so it is a bucket here rather than something the caller re-derives).

    Amounts are in the company's default currency; anything else is counted in
    `skipped_other_currency` rather than summed at face value.
    """

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    statuses: list[StatusBucketResponse]
    by_month: dict[str, Decimal]
    count_by_month: dict[str, int]
    invoice_count: int
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    draft_count: int
    overdue_count: int
    overdue_total: Decimal
    skipped_other_currency: int


class ClientStatsResponse(BaseModel):
    """Client 360's header. `average_days_to_payment` covers fully-paid invoices
    only — a partially paid one has no settlement date yet."""

    client_id: UUID
    company_id: UUID
    currency: str
    invoice_count: int
    draft_count: int
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    credited_total: Decimal
    credit_note_count: int
    overdue_count: int
    overdue_total: Decimal
    first_invoice_date: date | None
    last_invoice_date: date | None
    average_days_to_payment: int | None
    skipped_other_currency: int


class TimelineEventResponse(BaseModel):
    """One commercial event. `kind` is one of `invoice_drafted`,
    `invoice_issued`, `invoice_voided`, `credit_note_issued`,
    `payment_received`."""

    at: date
    kind: str
    amount: Decimal
    currency: str
    invoice_id: UUID | None
    credit_note_id: UUID | None
    payment_id: UUID | None
    reference: str | None
    detail: str | None


class IdentifierCheck(BaseModel):
    """One identifier the Belgian checksum rules can decide on."""

    field: str
    value: str | None
    valid: bool
    normalized: str | None = None
    message_key: str | None = None


class CompanyValidationResponse(BaseModel):
    """Whether a company's own identifiers hold up, and whether it could act as
    a Peppol supplier at all.

    `peppol_ready` is about the *supplier* half only: the customer half of the
    gate needs a client, and a B2C client fails it no matter how correct this
    company is. So a `peppol_ready: true` company can still be refused at export
    time — this endpoint exists to fix typos in a settings form, not to promise
    delivery.
    """

    company_id: UUID
    valid: bool
    peppol_ready: bool
    checks: list[IdentifierCheck]
    missing_for_peppol: list[str]
