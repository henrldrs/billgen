from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base, IdentifiedRowMixin


class SubscriptionRow(IdentifiedRowMixin, Base):
    """Stripe subscription state, one per organization. Populated by the billing
    webhook (Phase 10); present now so the schema doesn't need a migration then."""

    __tablename__ = "subscriptions"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id"), nullable=False, unique=True
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(64))
    plan_tier: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="inactive")
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
