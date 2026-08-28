"""The expense row behind TVA Intelligence (`core/tva/`).

Two shape decisions, both taken from the scaffold's README rather than invented
here:

**`source_document_key` is a dangling reference, deliberately.** Blob storage
(B2) is unbuilt, so this column holds a key to an object nobody stores yet —
exactly the way `Company.logo_key` already does. The alternative was to invent a
storage model to satisfy a column, which is how a table bakes in a decision
nobody made.

**Extraction output, checks and classification are JSON, not columns.** They are
the *result* of a vendor process that has not been chosen (§3 of the blueprint),
and `ExtractedFields` has fourteen optional fields whose set will move when the
extractor is picked. Flattening them into columns now buys nothing — nothing
queries on `tva_rate` — and costs a migration every time the extractor changes.
`AuditLogRow.before/after` already establishes JSON as the shape for
"structured, stored whole, never filtered on".
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from ._base import MONEY_PRECISION, MONEY_SCALE, Base, TenantRowMixin


class ExpenseRow(TenantRowMixin, Base):
    __tablename__ = "expenses"
    __table_args__ = (
        #  An index, deliberately NOT a unique constraint.
        #
        #  A re-imported supplier document has to be *storable*: the whole
        #  duplicate design is to keep the second copy, stamp it with
        #  `duplicate_of_id`, and put it in the exception queue for a human to
        #  look at. A unique constraint here would make the database refuse the
        #  insert, so the feature would fail with a 500 at exactly the moment it
        #  is supposed to work. This index is what makes `find_duplicate`'s
        #  lookup cheap; the rule itself lives in ExpenseService.
        Index(
            "ix_expenses_supplier_document",
            "organization_id",
            "company_id",
            "supplier_vat_number",
            "supplier_invoice_number",
        ),
        #  The exception queue and the analyzer read by state; the period
        #  analysis reads by document date.
        Index("ix_expenses_state", "organization_id", "state"),
        Index("ix_expenses_invoice_date", "organization_id", "invoice_date"),
    )

    company_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=False, index=True
    )

    state: Mapped[str] = mapped_column(String(32), nullable=False, default="imported")

    source_filename: Mapped[str | None] = mapped_column(String(255))
    #  Points into blob storage that does not exist yet. See the module
    #  docstring — this is a known dangling reference, not an oversight.
    source_document_key: Mapped[str | None] = mapped_column(String(512))

    #  Promoted out of the extraction JSON so the duplicate lookup is an
    #  indexed equality test rather than a scan that parses JSON per row.
    #  Everything else stays in `extracted`.
    supplier_vat_number: Mapped[str | None] = mapped_column(String(32))
    supplier_invoice_number: Mapped[str | None] = mapped_column(String(64))
    invoice_date: Mapped[date | None] = mapped_column(Date)

    #  Denormalised from the classification for the analyzer's period sums. The
    #  classification JSON stays authoritative; these exist so a period total is
    #  a SUM rather than a full table scan through JSON in Python.
    detected_tva: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False, default=Decimal("0")
    )
    recoverable_tva: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_PRECISION, MONEY_SCALE), nullable=False, default=Decimal("0")
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    extracted: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    checks: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    classification: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    duplicate_of_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("expenses.id"), index=True
    )
    failure_code: Mapped[str | None] = mapped_column(Text)
