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


class ClientRowResponse(BaseModel):
    client_id: UUID
    name: str
    invoice_count: int
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    overdue_count: int
    overdue_total: Decimal
    last_invoice_date: date | None


class ClientReportResponse(BaseModel):
    """Revenue and debt per client — see
    `core.services.reporting_service.ClientReport`. Clients with no invoices in
    the period are absent rather than zeroed; `GET /clients` is the customer
    list."""

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    clients: list[ClientRowResponse]
    client_count: int
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    skipped_other_currency: int


class ProductRowResponse(BaseModel):
    # null groups every free-text line — how most invoices are actually
    # written, and real sales rather than a gap in the data.
    product_id: UUID | None
    name: str
    invoice_count: int
    quantity: Decimal
    net_ht: Decimal


class ProductReportResponse(BaseModel):
    """Volume and mix by invoice line — see
    `core.services.reporting_service.ProductReport`. Amounts are line net HT and
    carry no share of any invoice-level discount, so this legitimately sums
    higher than the net revenue in /reports/invoices."""

    company_id: UUID
    period: str | None
    period_start: date | None
    period_end: date | None
    currency: str
    products: list[ProductRowResponse]
    line_count: int
    net_ht: Decimal
    skipped_other_currency: int
