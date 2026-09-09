from decimal import Decimal
from uuid import UUID

from sqlalchemy import JSON, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from ._base import MONEY_PRECISION, MONEY_SCALE, Base, TenantRowMixin


class ProductRow(TenantRowMixin, Base):
    __tablename__ = "products"

    company_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100))

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")

    billing_type: Mapped[str] = mapped_column(String(20), nullable=False, default="fixed")
    supply_kind: Mapped[str] = mapped_column(String(10), nullable=False, default="services")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    pipeline_stage: Mapped[str | None] = mapped_column(String(100))

    default_vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
