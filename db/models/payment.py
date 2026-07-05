from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from ._base import MONEY_PRECISION, MONEY_SCALE, Base, TenantRowMixin


class PaymentRow(TenantRowMixin, Base):
    __tablename__ = "payments"

    invoice_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("invoices.id"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    method: Mapped[str] = mapped_column(String(20), nullable=False, default="bank_transfer")
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    reference: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
