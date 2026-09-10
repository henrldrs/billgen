from uuid import UUID

from sqlalchemy import BigInteger, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base, TenantRowMixin


class DocumentRow(TenantRowMixin, Base):
    """A file on disk, registered. See core/models/document.py for why the row
    is authoritative and the file is not."""

    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "path", name="uq_documents_organization_id_path"
        ),
    )

    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    #  Unique per organization: `invoices/<year>/<reference>.pdf` embeds a
    #  gapless reference, so two rows on one path would mean two documents
    #  claiming one number.
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    byte_size: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    target_type: Mapped[str | None] = mapped_column(String(64), index=True)
    target_id: Mapped[UUID | None] = mapped_column(Uuid, index=True)
