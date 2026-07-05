from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Date,
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


class CreditNoteRow(TenantRowMixin, Base):
    __tablename__ = "credit_notes"
    __table_args__ = (
        UniqueConstraint("organization_id", "company_id", "reference"),
        UniqueConstraint("organization_id", "company_id", "sequence_global"),
    )

    company_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=False, index=True
    )
    client_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("clients.id"), nullable=False, index=True
    )
    invoice_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("invoices.id"), nullable=False, index=True
    )

    reference: Mapped[str] = mapped_column(String(64), nullable=False)
    sequence_global: Mapped[int] = mapped_column(Integer, nullable=False)

    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    comments: Mapped[str | None] = mapped_column(Text)
    pdf_template: Mapped[str] = mapped_column(String(64), nullable=False, default="credit_note")

    subtotal_ht: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    total_vat: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    total_ttc: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )

    lines: Mapped[list["CreditNoteLineRow"]] = relationship(
        cascade="all, delete-orphan",
        order_by="CreditNoteLineRow.line_number",
        lazy="selectin",
    )


class CreditNoteLineRow(Base):
    __tablename__ = "credit_note_lines"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    credit_note_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False, index=True
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

    vat_category: Mapped[str] = mapped_column(String(2), nullable=False, default="S")
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    vat_legal_mention: Mapped[str | None] = mapped_column(Text)
