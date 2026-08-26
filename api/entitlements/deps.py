"""FastAPI dependencies that enforce the commercial matrix.

Endpoints declare a **capability**, never a plan name:

    @router.post("/invoices")
    def create_invoice(_: None = Depends(require_quota(Meter.INVOICES))): ...
    @router.post("/recurring")
    def create_rule(_: None = Depends(require_feature("recurring_invoices"))): ...

`invoice.create` is a product capability; `starter` is a commercial decision.
Keeping plan names out of the routers is what stops `if tier == "business"` from
spreading through the codebase — the matrix is the only place that mapping
exists.

Desktop mode is exempt: it runs a local SQLite database for one person with no
subscription behind it, and is licensed separately (`desktop/licensing.py`).
Metering a single-user offline install would refuse work nobody is being billed
for.
"""

from __future__ import annotations

from collections.abc import Iterator
from uuid import UUID

from fastapi import Depends, Request

from core.tenancy import current_organization_id

from . import service
from .matrix import Meter
from .service import Entitlements


def _organization_id(request: Request) -> UUID:
    """The org the tenant middleware already bound for this request."""
    org_id = getattr(request.state, "org_id", None)
    return org_id if org_id is not None else current_organization_id()


def _exempt(request: Request) -> bool:
    return bool(getattr(request.app.state.settings, "desktop_mode", False))


def get_entitlements(request: Request) -> Entitlements:
    """The caller's resolved plan. Cheap enough to depend on directly."""
    session_factory = request.app.state.session_factory
    with session_factory() as session:
        return service.resolve(session, _organization_id(request))


def pdf_branded(request: Request) -> bool:
    """Whether this caller's PDFs carry the BillGen footer.

    The Free → Starter conversion lever, and the reason it is phrased as
    "remove branding" rather than "unlock PDF export": a free account can still
    produce and send a complete, legally valid Belgian invoice. Only the footer
    is at stake.
    """
    if _exempt(request):
        return False
    return not get_entitlements(request).allows("pdf_remove_branding")


def require_feature(feature: str):
    """402 unless the caller's plan includes `feature`."""

    def dependency(request: Request) -> None:
        if _exempt(request):
            return
        get_entitlements(request).require(feature)

    return dependency


def require_quota(meter: Meter):
    """402 unless the caller may create one more unit of `meter`.

    Yields, so the organization row lock taken during the check is still held
    while the endpoint body runs — see `service.quota_guard` for why that
    matters under concurrency.
    """

    def dependency(request: Request) -> Iterator[None]:
        if _exempt(request):
            yield
            return
        session_factory = request.app.state.session_factory
        with session_factory() as session, service.quota_guard(
            session, _organization_id(request), meter
        ):
            yield

    return dependency


__all__ = [
    "Depends",
    "Entitlements",
    "get_entitlements",
    "pdf_branded",
    "require_feature",
    "require_quota",
]
