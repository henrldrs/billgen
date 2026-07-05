from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base, IdentifiedRowMixin


class OrganizationRow(IdentifiedRowMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, default="BE")
    plan_tier: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(64))
