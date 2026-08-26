"""How much of each allowance an organization has consumed.

**Usage is derived, never accumulated.** Every count here is a `COUNT(*)` over
the rows that already exist, filtered on `created_at` for the flow meters. There
is no counter column to increment, which means there is no counter to drift:
a restore, a legacy import, a deleted draft or a manual DB fix all move the
number automatically and correctly. An incremented counter would have to be
repaired by hand after any of those.

The one meter without its own table is Peppol documents. Those are counted from
the audit log (`EXPORT_PEPPOL`), which is append-only by design — so it is a
sound ledger for a monthly allowance.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from db.models import (
    AuditLogRow,
    ClientRow,
    CompanyRow,
    InvoiceRow,
    OrgMembershipRow,
    ProductRow,
)

from .matrix import METER_KINDS, Meter, MeterKind


def current_period(today: date | None = None) -> str:
    """The billing period a flow meter is measured over: one calendar month."""
    today = today or datetime.now(UTC).date()
    return f"{today.year:04d}-{today.month:02d}"


def period_bounds(period: str) -> tuple[datetime, datetime]:
    """Inclusive start, exclusive end, in UTC — matching `created_at`."""
    year, month = (int(part) for part in period.split("-"))
    start = datetime(year, month, 1, tzinfo=UTC)
    last_day = calendar.monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, 999999, tzinfo=UTC)
    return start, end


@dataclass(frozen=True)
class MeterUsage:
    meter: Meter
    used: int
    limit: int | None
    period: str | None

    @property
    def unlimited(self) -> bool:
        return self.limit is None

    @property
    def remaining(self) -> int | None:
        return None if self.limit is None else max(self.limit - self.used, 0)

    @property
    def exhausted(self) -> bool:
        return self.limit is not None and self.used >= self.limit


_STOCK_TABLES = {
    Meter.CLIENTS: ClientRow,
    Meter.PRODUCTS: ProductRow,
    Meter.COMPANIES: CompanyRow,
}


def count_used(
    session: Session, organization_id: UUID, meter: Meter, period: str | None = None
) -> int:
    """Units of `meter` consumed by this organization.

    Scoped by an explicit `organization_id` rather than the tenant ContextVar:
    this runs in the API layer, where the org is already known from the JWT, and
    an explicit argument keeps the query readable next to the domain
    repositories that (correctly) do the opposite.
    """
    kind = METER_KINDS[meter]

    if meter is Meter.SEATS:
        stmt = select(func.count()).select_from(OrgMembershipRow).where(
            OrgMembershipRow.organization_id == organization_id
        )
        return int(session.execute(stmt).scalar_one())

    if kind is MeterKind.STOCK:
        table = _STOCK_TABLES[meter]
        stmt = select(func.count()).select_from(table).where(
            table.organization_id == organization_id
        )
        return int(session.execute(stmt).scalar_one())

    start, end = period_bounds(period or current_period())

    if meter is Meter.INVOICES:
        # Counts drafts too: creating a draft is the billable act, and issuing
        # it later must never be the thing that fails. A deleted draft frees its
        # slot, which is the forgiving direction.
        stmt = (
            select(func.count())
            .select_from(InvoiceRow)
            .where(
                InvoiceRow.organization_id == organization_id,
                InvoiceRow.created_at >= start,
                InvoiceRow.created_at <= end,
            )
        )
        return int(session.execute(stmt).scalar_one())

    if meter is Meter.PEPPOL_DOCUMENTS:
        # DISTINCT on the invoice, not a count of export actions. "5 Peppol
        # documents" is how a customer thinks about it: five invoices sent, not
        # five clicks. Re-downloading a file you already exported this period
        # must not burn a second slot — losing a download should never cost
        # money. See `peppol_already_counted`.
        stmt = (
            select(func.count(func.distinct(AuditLogRow.target_id)))
            .select_from(AuditLogRow)
            .where(
                AuditLogRow.organization_id == organization_id,
                AuditLogRow.action == "export_peppol",
                AuditLogRow.timestamp >= start,
                AuditLogRow.timestamp <= end,
            )
        )
        return int(session.execute(stmt).scalar_one())

    raise ValueError(f"No usage source for meter {meter}")  # pragma: no cover


def peppol_already_counted(
    session: Session, organization_id: UUID, invoice_id: UUID, period: str | None = None
) -> bool:
    """Has this invoice already consumed a Peppol slot in this period?

    If so the export is free, even at the cap: the allowance counts documents,
    and this document is already one of them.
    """
    start, end = period_bounds(period or current_period())
    stmt = (
        select(AuditLogRow.id)
        .where(
            AuditLogRow.organization_id == organization_id,
            AuditLogRow.action == "export_peppol",
            AuditLogRow.target_id == invoice_id,
            AuditLogRow.timestamp >= start,
            AuditLogRow.timestamp <= end,
        )
        .limit(1)
    )
    return session.execute(stmt).first() is not None
