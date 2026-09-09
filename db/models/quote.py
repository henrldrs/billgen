from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ._base import MONEY_PRECISION, MONEY_SCALE, Base, TenantRowMixin


class QuoteRow(TenantRowMixin, Base):
    __tablename__ = "quotes"
    __table_args__ = (
        # Named explicitly. The "uq" convention keys off the first column only,
        # so both of these would come out as `uq_quotes_organization_id` — one
        # CREATE TABLE with two constraints of the same name, which SQLite
        # tolerates and PostgreSQL refuses outright.
        UniqueConstraint(
            "organization_id", "company_id", "reference", name="uq_quotes_reference"
        ),
        UniqueConstraint(
            "organization_id",
            "company_id",
            "sequence_global",
            name="uq_quotes_sequence_global",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=False, index=True
    )
    client_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("clients.id"), nullable=False, index=True
    )

    # Not nullable, unlike an invoice's: a quote is numbered when it is created.
    # Its series is its own — see core.models.quote.Quote.
    reference: Mapped[str] = mapped_column(String(64), nullable=False)
    sequence_global: Mapped[int] = mapped_column(Integer, nullable=False)

    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[date | None] = mapped_column(Date)

    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")

    quote_discount_type: Mapped[str | None] = mapped_column(String(20))
    quote_discount_value: Mapped[Decimal | None] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE)
    )
    quote_discount_reason: Mapped[str | None] = mapped_column(String(255))

    comments: Mapped[str | None] = mapped_column(Text)
    terms: Mapped[str | None] = mapped_column(Text)
    pdf_template: Mapped[str] = mapped_column(String(64), nullable=False, default="fr_standard")

    subtotal_ht: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    total_discount: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    total_vat: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    total_ttc: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_note: Mapped[str | None] = mapped_column(Text)
    # No FK, for the same reason invoices.voided_by_credit_note_id has none: a
    # circular pair between quotes and invoices complicates inserts and SQLite
    # migrations. QuoteService is what keeps it honest.
    converted_invoice_id: Mapped[UUID | None] = mapped_column(Uuid)

    lines: Mapped[list["QuoteLineRow"]] = relationship(
        cascade="all, delete-orphan",
        order_by="QuoteLineRow.line_number",
        lazy="selectin",
    )


class QuoteLineRow(Base):
    __tablename__ = "quote_lines"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    quote_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id"), nullable=False, index=True
    )

    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    product_id: Mapped[UUID | None] = mapped_column(Uuid)
    supply_kind: Mapped[str] = mapped_column(
        String(10), nullable=False, default="services"
    )

    vat_category: Mapped[str] = mapped_column(String(2), nullable=False, default="S")
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    vat_legal_mention: Mapped[str | None] = mapped_column(Text)

    discount_type: Mapped[str | None] = mapped_column(String(20))
    discount_value: Mapped[Decimal | None] = mapped_column(Numeric(MONEY_PRECISION, MONEY_SCALE))
    discount_reason: Mapped[str | None] = mapped_column(String(255))
