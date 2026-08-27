"""FastAPI dependencies that enforce the authorization matrix.

    @router.post("/invoices/{invoice_id}/void")
    def void(_: None = Depends(require_permission(Permission.INVOICE_VOID))): ...

The role comes from the access token's `role` claim, bound onto request state
by the tenant middleware. It is therefore as fresh as the token: a demotion
takes effect when the access token next expires, not instantly. That is the
usual JWT trade and it is fine here — the alternative is a membership read on
every write, and a role change is rare and rarely urgent.

There is no desktop-mode exemption, and no need for one: the desktop build
bootstraps its single local user as `owner`, which holds every permission.
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..deps import current_role
from .errors import PermissionDeniedError
from .matrix import Permission, allows


def require_permission(permission: Permission):
    """403 unless the caller's role holds `permission`."""

    def dependency(request: Request) -> None:
        role = current_role(request)
        if not allows(role, permission):
            raise PermissionDeniedError(permission, role)

    return dependency


__all__ = ["Depends", "Permission", "PermissionDeniedError", "require_permission"]
