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
    def update(self, user: User) -> User:
        """Edit a user's own profile.

        Email is deliberately not updatable through this path. Changing it is an
        identity change, not a profile edit: it needs the new address verified
        before it becomes the login, and verification needs email transport,
        which the product does not have (B1). Allowing it here would let someone
        lock themselves out of their own account by typo.
        """
        ...

    @abstractmethod
    def add_membership(self, membership: OrgMembership) -> OrgMembership: ...

    @abstractmethod
    def memberships_for_user(self, user_id: UUID) -> list[OrgMembership]: ...
