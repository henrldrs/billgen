from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
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


class InvoiceRow(TenantRowMixin, Base):
    __tablename__ = "invoices"
    __table_args__ = (
        # Named explicitly. The "uq" convention keys off the first column only,
        # so both of these would come out as `uq_invoices_organization_id` — one
        # CREATE TABLE with two constraints of the same name, which SQLite
        # tolerates and PostgreSQL refuses outright.
        UniqueConstraint(
            "organization_id", "company_id", "reference", name="uq_invoices_reference"
        ),
        UniqueConstraint(
            "organization_id",
            "company_id",
            "sequence_global",
            name="uq_invoices_sequence_global",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=False, index=True
    )
    client_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("clients.id"), nullable=False, index=True
    )

    # Nullable: a DRAFT invoice has no gapless number yet (ADR-0002). Assigned at
    # issue(). NULLs are distinct under the unique constraints, so many drafts
    # coexist; issued rows still get a unique (org, company, reference/sequence).
    reference: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sequence_global: Mapped[int | None] = mapped_column(Integer, nullable=True)

    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)

    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")

    invoice_discount_type: Mapped[str | None] = mapped_column(String(20))
    invoice_discount_value: Mapped[Decimal | None] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE)
    )
    invoice_discount_reason: Mapped[str | None] = mapped_column(String(255))

    comments: Mapped[str | None] = mapped_column(Text)
    payment_terms: Mapped[str | None] = mapped_column(Text)
    pdf_template: Mapped[str] = mapped_column(String(64), nullable=False, default="fr_standard")

    #  The template as it was when this invoice was issued, by value. Rule 3 of
    #  the template studio: editing a template must never restyle a document
    #  already sent. Storing the template *id* instead would resolve to whatever
    #  the template says today, which is the exact failure this prevents.
    #  Null for every invoice issued before templates existed, and for drafts.
    template_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON)

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
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    voided_reason: Mapped[str | None] = mapped_column(Text)
    # No FK: credit_notes also references invoices; a circular FK pair complicates
    # inserts and SQLite migrations. Integrity is enforced by credit_note_service.
    voided_by_credit_note_id: Mapped[UUID | None] = mapped_column(Uuid)

    lines: Mapped[list["InvoiceLineRow"]] = relationship(
        cascade="all, delete-orphan",
        order_by="InvoiceLineRow.line_number",
        lazy="selectin",
    )


class InvoiceLineRow(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    invoice_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
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
