"""Import a legacy `FinanceFlow BillGen` backup into the current organization.

Companies, clients, and products (services) are imported; historical invoices
are counted and reported but **not** imported — recreating them would mint live,
legally-binding invoice numbers, which must not happen as a side effect of an
import. See the handoff (Phase 11b) for that follow-up.

`preview()` reads only and predicts the result (a dry run). `commit()` does the
same work for real inside a single UnitOfWork — all or nothing — writing a
`CREATE` audit entry per created row plus one `IMPORT` summary entry. Both are
idempotent-friendly: rows that already exist (matched by name within their
scope) or that repeat within the file are skipped, so re-running never
duplicates.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any
from uuid import UUID

from ..imports import (
    ImportIssue,
    ImportReport,
    MappingError,
    map_client,
    map_company,
    map_product,
    parse_backup,
)
from ..imports.legacy_backup import LegacyCompany
from ..models import AuditAction, Company
from ..repository import UnitOfWork
from ..tenancy import current_organization_id
from . import _audit


class ImportService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def preview(self, data: Any) -> ImportReport:
        return self._run(data, dry_run=True, actor_user_id=None)

    def commit(self, data: Any, actor_user_id: UUID | None = None) -> ImportReport:
        return self._run(data, dry_run=False, actor_user_id=actor_user_id)

    def _run(self, data: Any, *, dry_run: bool, actor_user_id: UUID | None) -> ImportReport:
        backup = parse_backup(data)  # raises BusinessRuleError on invalid input
        report = ImportReport(dry_run=dry_run, invoices_detected=backup.invoices_detected)
        org_id = current_organization_id()

        with self._uow_factory() as uow:
            # Name -> resolved company, seeded from what's already stored so a
            # re-import attaches to the existing company instead of duplicating.
            companies_by_name: dict[str, Company] = {
                c.name.strip().lower(): c for c in uow.companies.list()
            }

            for legacy in backup.companies:
                target = self._import_company(
                    uow, legacy, org_id, companies_by_name, report, dry_run, actor_user_id
                )
                if target is None:
                    continue
                self._import_children(
                    uow, legacy, org_id, target, report, dry_run, actor_user_id
                )

            if not dry_run:
                _audit.record(
                    uow,
                    action=AuditAction.IMPORT,
                    target_type="import",
                    after={
                        "companies": report.companies.model_dump(),
                        "clients": report.clients.model_dump(),
                        "products": report.products.model_dump(),
                        "invoices_detected": report.invoices_detected,
                    },
                    actor_user_id=actor_user_id,
                )
                uow.commit()

        return report

    def _import_company(
        self,
        uow: UnitOfWork,
        legacy: LegacyCompany,
        org_id: UUID,
        companies_by_name: dict[str, Company],
        report: ImportReport,
        dry_run: bool,
        actor_user_id: UUID | None,
    ) -> Company | None:
        try:
            company = map_company(legacy.raw, org_id)
        except MappingError as exc:
            report.companies.failed += 1
            report.issues.append(
                ImportIssue(
                    entity="company",
                    name=str(legacy.raw.get("name") or "?"),
                    reason=str(exc),
                )
            )
            return None

        key = company.name.strip().lower()
        existing = companies_by_name.get(key)
        if existing is not None:
            report.companies.skipped += 1
            return existing

        report.companies.created += 1
        companies_by_name[key] = company  # dedupe within the file too
        if not dry_run:
            uow.companies.add(company)
            _audit.record(
                uow,
                action=AuditAction.CREATE,
                target_type="company",
                target_id=company.id,
                after={"name": company.name},
                actor_user_id=actor_user_id,
            )
        return company

    def _import_children(
        self,
        uow: UnitOfWork,
        legacy: LegacyCompany,
        org_id: UUID,
        company: Company,
        report: ImportReport,
        dry_run: bool,
        actor_user_id: UUID | None,
    ) -> None:
        # Existing rows under this company (empty for a company we just created).
        seen_clients = {c.name.strip().lower() for c in uow.clients.list(company_id=company.id)}
        seen_products = {p.name.strip().lower() for p in uow.products.list(company_id=company.id)}

        for raw in legacy.clients:
            try:
                client = map_client(raw, org_id, company.id)
            except MappingError as exc:
                report.clients.failed += 1
                report.issues.append(
                    ImportIssue(entity="client", name=str(raw.get("name") or "?"), reason=str(exc))
                )
                continue
            key = client.name.strip().lower()
            if key in seen_clients:
                report.clients.skipped += 1
                continue
            seen_clients.add(key)
            report.clients.created += 1
            if not dry_run:
                uow.clients.add(client)
                _audit.record(
                    uow,
                    action=AuditAction.CREATE,
                    target_type="client",
                    target_id=client.id,
                    after={"name": client.name},
                    actor_user_id=actor_user_id,
                )

        for raw in legacy.products:
            try:
                product = map_product(raw, org_id, company.id)
            except MappingError as exc:
                report.products.failed += 1
                name = str(raw.get("description") or raw.get("name") or "?")
                report.issues.append(
                    ImportIssue(entity="product", name=name, reason=str(exc))
                )
                continue
            key = product.name.strip().lower()
            if key in seen_products:
                report.products.skipped += 1
                continue
            seen_products.add(key)
            report.products.created += 1
            if not dry_run:
                uow.products.add(product)
                _audit.record(
                    uow,
                    action=AuditAction.CREATE,
                    target_type="product",
                    target_id=product.id,
                    after={"name": product.name, "unit_price": product.unit_price},
                    actor_user_id=actor_user_id,
                )
