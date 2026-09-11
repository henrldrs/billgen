from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Organization


class OrganizationRepository(ABC):
    """Not tenant-scoped: organizations are created before any tenant context exists
    (signup) and looked up while establishing one (login)."""

    @abstractmethod
    def add(self, organization: Organization) -> Organization: ...

    @abstractmethod
    def get(self, organization_id: UUID) -> Organization | None: ...

    @abstractmethod
    def update(self, organization: Organization) -> Organization:
        """Name, country and the onboarding stamp. Never the plan tier — that is
        the subscription's to change, through its own service."""
