from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction, Organization
from ..repository import UnitOfWork
from ..tenancy import current_organization_id, organization_context
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

    def rename(self, name: str, actor_user_id: UUID | None = None) -> Organization:
        """Rename the bound organization. Its name is what a legal text is
        accepted *for*, so leaving it at the desktop bootstrap's placeholder is
        what T-29's first run refuses to finish on."""
        org_id = current_organization_id()
        with self._uow_factory() as uow:
            org = uow.organizations.get(org_id)
            if org is None:
                raise NotFoundError(f"Organization {org_id} not found")
            renamed = uow.organizations.update(org.model_copy(update={"name": name.strip()}))
            _audit.record(
                uow,
                action=AuditAction.UPDATE,
                target_type="organization",
                target_id=org_id,
                before={"name": org.name},
                after={"name": renamed.name},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return renamed

    def get(self, organization_id: UUID) -> Organization:
        with self._uow_factory() as uow:
            org = uow.organizations.get(organization_id)
            if org is None:
                raise NotFoundError(f"Organization {organization_id} not found")
            return org
