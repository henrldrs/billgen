"""Tenant context — the single source of the "current organization".

The API layer binds the organization from the JWT claim into a ContextVar;
repositories read it from here. Repository methods never accept a raw
organization_id parameter, so a bug in a router cannot cross tenants (ADR-0001).
"""

from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from uuid import UUID


class TenantContextError(RuntimeError):
    """No organization bound to the current execution context."""


class TenantViolationError(RuntimeError):
    """An entity's organization_id does not match the bound organization."""


_current_org_id: ContextVar[UUID | None] = ContextVar("billgen_current_org_id", default=None)


def current_organization_id() -> UUID:
    org_id = _current_org_id.get()
    if org_id is None:
        raise TenantContextError(
            "No organization bound to this context. Wrap the call in organization_context()."
        )
    return org_id


def maybe_organization_id() -> UUID | None:
    return _current_org_id.get()


@contextmanager
def organization_context(org_id: UUID) -> Iterator[None]:
    token = _current_org_id.set(org_id)
    try:
        yield
    finally:
        _current_org_id.reset(token)


def guard_tenant(entity_org_id: UUID) -> None:
    if entity_org_id != current_organization_id():
        raise TenantViolationError(
            "Entity organization_id does not match the current organization context."
        )
