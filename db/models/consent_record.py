from uuid import UUID

from sqlalchemy import JSON, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base, TenantRowMixin


class ConsentRecordRow(TenantRowMixin, Base):
    """One consent decision. Append-only: a change of mind is a new row, and
    the newest row is the one that counts — the history is the point."""

    __tablename__ = "consent_records"

    user_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    state: Mapped[dict] = mapped_column(JSON, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="settings")
