from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import DomainModel, TenantModel
from .currency import Currency
from .discount import Discount
from .tax import SupplyKind, VATRate


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    VOIDED = "voided"


class InvoiceLine(DomainModel):
    line_number: int = Field(ge=1)
    description: str = Field(min_length=1)
    quantity: Decimal = Field(gt=Decimal("0"))
    unit_price: Decimal = Field(ge=Decimal("0"))
    product_id: UUID | None = None
    # Copied from the product at composition and frozen at issue with
    # everything else on the line: the catalogue may be re-classified later,
    # and a document that was correct when issued stays correct.
    supply_kind: SupplyKind = SupplyKind.SERVICES
    vat: VATRate = Field(default_factory=VATRate)
    discount: Discount | None = None


class Invoice(TenantModel):
    company_id: UUID
    client_id: UUID

    # Assigned only at issue(): a DRAFT has no gapless number yet. Once issued,
    # both are set and frozen (ADR-0002). Kept nullable so drafts carry no number.
    reference: str | None = Field(default=None, max_length=64)
    sequence_global: int | None = Field(default=None, ge=1)

    issue_date: date
    due_date: date | None = None

    currency: Currency = Currency.EUR
    lines: list[InvoiceLine] = Field(default_factory=list)
    invoice_discount: Discount | None = None
    comments: str | None = None
    payment_terms: str | None = None

    pdf_template: str = "fr_standard"

    subtotal_ht: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_discount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_vat: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    total_ttc: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))

    status: InvoiceStatus = InvoiceStatus.DRAFT
    voided_at: datetime | None = None
    voided_reason: str | None = None
    voided_by_credit_note_id: UUID | None = None

    def effective_status(self, today: date) -> str:
        """The stored status refined with the calendar.

        An issued or partially paid invoice whose due date has passed is
        overdue the moment it is looked at. Nothing writes OVERDUE to the row —
        a stored flag would need a scheduler to stay true — so the reports,
        the KPIs, the alerts and the list filter all ask this instead (T-51).
        Strict: an invoice due today is still on time. A draft binds nobody;
        paid and voided invoices are closed whatever their date said.
        """
        if self.status in (InvoiceStatus.VOIDED, InvoiceStatus.PAID, InvoiceStatus.DRAFT):
            return self.status.value
        if self.due_date and self.due_date < today:
            return InvoiceStatus.OVERDUE.value
        return self.status.value
