from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction, Company
from ..repository import UnitOfWork
from . import _audit
from .errors import NotFoundError


class CompanyService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def create(self, company: Company, actor_user_id: UUID | None = None) -> Company:
        with self._uow_factory() as uow:
            saved = uow.companies.add(company)
            _audit.record(
                uow,
                action=AuditAction.CREATE,
                target_type="company",
                target_id=saved.id,
                after={"name": saved.name},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved

    def get(self, company_id: UUID) -> Company:
        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            return company

    def list(self) -> list[Company]:
        with self._uow_factory() as uow:
            return uow.companies.list()

    def update(self, company: Company, actor_user_id: UUID | None = None) -> Company:
        with self._uow_factory() as uow:
            before = uow.companies.get(company.id)
            if before is None:
                raise NotFoundError(f"Company {company.id} not found")
            saved = uow.companies.update(company)
            _audit.record(
                uow,
                action=AuditAction.UPDATE,
                target_type="company",
                target_id=saved.id,
                before={"name": before.name},
                after={"name": saved.name},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved
