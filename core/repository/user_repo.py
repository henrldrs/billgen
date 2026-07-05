from abc import ABC, abstractmethod
from uuid import UUID

from ..models import OrgMembership, User


class UserRepository(ABC):
    """Not tenant-scoped: users authenticate before any tenant context exists."""

    @abstractmethod
    def add(self, user: User) -> User: ...

    @abstractmethod
    def get(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    def add_membership(self, membership: OrgMembership) -> OrgMembership: ...

    @abstractmethod
    def memberships_for_user(self, user_id: UUID) -> list[OrgMembership]: ...
