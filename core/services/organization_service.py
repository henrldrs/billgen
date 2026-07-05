from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction, Organization
from ..repository import UnitOfWork
from ..tenancy import organization_context
from . import _audit
from .errors import NotFoundError


class OrganizationService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def create(self, *, name: str, country_code: str = "BE") -> Organization:
        """Create a tenant. Runs outside any tenant context (signup); the audit
        entry is written inside the new organization's own context."""
        org = Organization(name=name, country_code=country_code)
        with self._uow_factory() as uow:
            uow.organizations.add(org)
            with organization_context(org.id):
                _audit.record(
                    uow,
                    action=AuditAction.CREATE,
                    target_type="organization",
                    target_id=org.id,
                    after={"name": org.name},
                )
            uow.commit()
            return org

    def get(self, organization_id: UUID) -> Organization:
        with self._uow_factory() as uow:
            org = uow.organizations.get(organization_id)
            if org is None:
                raise NotFoundError(f"Organization {organization_id} not found")
            return org
