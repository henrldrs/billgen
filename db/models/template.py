"""Document templates, their versions, and the snapshot an issued invoice keeps.

Three tables' worth of shape in two, and one column added to `invoices`
elsewhere in this package. All of it follows from rule 3 of the scaffold: **an
issued invoice must never be restyled by a later edit to its template.**

That rule is why `template_versions` exists at all. A single mutable
`document_templates` row would be cheaper and would be wrong the first time
somebody edits a template after sending an invoice with it — the invoice would
silently re-render with the new layout, and nobody would find out until a
customer compared two copies of the same document.

The layout itself is JSON. Blocks are a discriminated union of nine kinds with
different property sets (`frontend-react/src/workspace/templateSchema.ts`), and
normalising that into tables would produce a block table, a properties table per
kind, and a join nobody benefits from — the whole document is always read and
written at once, and never filtered on.

**No column here holds a colour.** `appearance.brand` carries token *names*.
A hex field would put the exact bypass the palette guard forbids in component
code into a database row, where no test can see it.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base, TenantRowMixin


class DocumentTemplateRow(TenantRowMixin, Base):
    """The template as it is edited: a name, a default flag, and a pointer at
    whichever version is currently published."""

    __tablename__ = "document_templates"
    __table_args__ = (
        # Explicit names, same trap as quotes and expenses: the "uq" convention
        # keys off the first column, so both of these would be
        # `uq_document_templates_organization_id`.
        #  `doc_type` is part of the key: "Standard" is a reasonable name for
        #  an invoice template AND for a quote template, and a company that
        #  cannot use it twice will end up with "Standard (quote)".
        UniqueConstraint(
            "organization_id",
            "company_id",
            "doc_type",
            "name",
            name="uq_document_templates_name",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(20), nullable=False, default="invoice")

    #  Exactly one default per company is a service-layer rule, not a partial
    #  unique index: SQLite's support for those is version-dependent, and the
    #  desktop build is the one target that cannot be upgraded on demand.
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    #  The working copy. Published versions are immutable rows in the sibling
    #  table; this is what the studio edits between publishes.
    draft_blocks: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    draft_appearance: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )

    published_version: Mapped[int | None] = mapped_column(Integer)


class TemplateVersionRow(TenantRowMixin, Base):
    """One published version. Immutable once written.

    Nothing updates a row in this table. Publishing writes a new one and moves
    `DocumentTemplateRow.published_version`; that is what lets an invoice's
    snapshot be checked against the version it claims to have used.
    """

    __tablename__ = "template_versions"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "template_id",
            "version",
            name="uq_template_versions_version",
        ),
    )

    template_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("document_templates.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)

    blocks: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    appearance: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
