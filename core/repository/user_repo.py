from abc import ABC, abstractmethod
from uuid import UUID

from ..models import OrgMembership, Role, User


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

    @abstractmethod
    def members_of(self, organization_id: UUID) -> list[tuple[User, OrgMembership]]:
        """Everyone in one organization, with the role each holds.

        Returns the pair rather than either alone: a member list without roles
        cannot be rendered, and a role without the person it belongs to cannot
        be either. Joined in SQL because the alternative is one query per member.
        """
        ...

    @abstractmethod
    def set_role(self, organization_id: UUID, user_id: UUID, role: Role) -> OrgMembership:
        """Change what one member may do. Raises KeyError if not a member."""
        ...
