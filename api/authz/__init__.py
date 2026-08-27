"""Authorization: what a *person* may do, as opposed to what a *plan* includes.

Nothing in `core/` may import this package, for the same reason it may not
import `api/entitlements`: CORE knows how to void an invoice, and this layer
decides whether the caller is allowed to ask. See `matrix.py` for the role
table and `errors.py` for the 403 contract.
"""

from .deps import require_permission
from .errors import PermissionDeniedError
from .matrix import ROLE_PERMISSIONS, Permission, allows, permissions_for, roles_with

__all__ = [
    "ROLE_PERMISSIONS",
    "Permission",
    "PermissionDeniedError",
    "allows",
    "permissions_for",
    "require_permission",
    "roles_with",
]
