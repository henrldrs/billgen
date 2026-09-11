from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base, TenantRowMixin


class LegalAcceptanceRow(TenantRowMixin, Base):
    """One user accepted one version of one legal document, once. A second
    acceptance of the same version is not a new fact, so it is not a new row."""

    __tablename__ = "legal_acceptances"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "user_id",
            "document_key",
            "version",
            name="uq_legal_acceptances_user_document_version",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    document_key: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="onboarding")
    document_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("documents.id"))
