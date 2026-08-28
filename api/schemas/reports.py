from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class KpiResponse(BaseModel):
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    counts: dict[str, int]
    overdue_count: int


class RevenueByMonthResponse(BaseModel):
    year: int
    months: dict[int, Decimal]


class VatReportLineResponse(BaseModel):
    category: str
    rate: Decimal
    invoiced_base: Decimal
    invoiced_vat: Decimal
    credited_base: Decimal
    credited_vat: Decimal
    net_base: Decimal
    net_vat: Decimal
    grid: str | None


class VatReportResponse(BaseModel):
    """Output VAT only — see `core.services.reporting_service.VatReport`. The
    caveat rides along in the payload so a UI cannot present this as a return
    ready to file."""

    period: str
    period_start: date
    period_end: date
    currency: str
    lines: list[VatReportLineResponse]
    invoiced_base: Decimal
    invoiced_vat: Decimal
    credited_base: Decimal
    credited_vat: Decimal
    net_base: Decimal
    net_vat: Decimal
    invoice_count: int
    credit_note_count: int
    skipped_other_currency: int
    covers: str = "output_vat_only"


class MethodBucketResponse(BaseModel):
    method: str
    count: int
    total: Decimal


class PaymentReportResponse(BaseModel):
    """Cash in over a period, split by method — see
    `core.services.reporting_service.PaymentReport`.

    `period` filters on the day the money arrived, not on the invoice it
    settles, so this and the invoice report legitimately disagree across a
    quarter boundary.
    """

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    methods: list[MethodBucketResponse]
    by_month: dict[str, Decimal]
    count_by_month: dict[str, int]
    payment_count: int
    total: Decimal
    largest: Decimal
    first_payment_on: date | None
    last_payment_on: date | None
    skipped_other_currency: int
