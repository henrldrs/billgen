"""The authorization refusal, and the wire shape it turns into.

**403 means authenticated but not authorized. 402 means commercially
unavailable.** See `api/entitlements/errors.py` for the other half of that
sentence. A 403 body names the roles that *would* be allowed, because the
useful thing to tell someone who cannot void an invoice is who can.
"""

from __future__ import annotations

from core.models import Role

from .matrix import Permission, roles_with


class PermissionDeniedError(Exception):
    """The caller's role does not hold the permission this endpoint requires."""

    def __init__(self, permission: Permission, role: str) -> None:
        self.permission = permission
        self.role = role
        self.allowed_roles: list[Role] = roles_with(permission)
        super().__init__(f"{role} may not {permission.value}")

    def body(self) -> dict:
        return {
            "error": "permission_denied",
            "detail": "Your role does not permit this action.",
            "permission": self.permission.value,
            "role": self.role,
            "allowed_roles": [role.value for role in self.allowed_roles],
        }
