from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base


class SequenceRow(Base):
    """Gapless counters. One row per (organization, company, scope); the value is
    advanced under a row lock (SELECT ... FOR UPDATE on Postgres; SQLite's file
    lock serializes writers)."""

    __tablename__ = "sequences"
    __table_args__ = (UniqueConstraint("organization_id", "company_id", "scope"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id"), nullable=False, index=True
    )
    company_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=False, index=True
    )
    scope: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
