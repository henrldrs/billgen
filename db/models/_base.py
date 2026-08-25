from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, MetaData, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column

# Deterministic constraint names — required for SQLite batch ALTERs in Alembic.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

# Money and quantity columns are Numeric(18, 6). On Postgres this is exact NUMERIC.
# On SQLite it is stored as REAL (double): exact up to ~13 significant digits, which
# safely covers invoice magnitudes for the desktop target. Values are quantized by
# core.rules.currency_math before persisting, so scale-6 round-trips are stable.
MONEY_PRECISION = 18
MONEY_SCALE = 6


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class IdentifiedRowMixin:
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class TenantRowMixin(IdentifiedRowMixin):
    @declared_attr
    def organization_id(cls) -> Mapped[UUID]:  # noqa: N805
        return mapped_column(
            Uuid, ForeignKey("organizations.id"), nullable=False, index=True
        )
