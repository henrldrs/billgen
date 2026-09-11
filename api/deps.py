from collections.abc import Callable
from uuid import UUID

from fastapi import HTTPException, Request

from core.documents import DocumentArchive
from core.repository import UnitOfWork


def get_uow_factory(request: Request) -> Callable[[], UnitOfWork]:
    return request.app.state.uow_factory


def get_document_archive(request: Request) -> DocumentArchive:
    """Where issued documents are written. A NullDocumentArchive when no
    DOCUMENT_ROOT is configured, so callers never branch on None.

    Per organization unless the layout is "flat" (T-33): the tenant the
    middleware bound is the directory, so two organizations issuing the same
    reference under one DOCUMENT_ROOT leave two files. The desktop is flat —
    one organization, and the folder is hers to browse.
    """
    archive: DocumentArchive = request.app.state.document_archive
    if request.app.state.settings.document_layout == "flat":
        return archive
    org_id = getattr(request.state, "org_id", None)
    if org_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return archive.scoped(str(org_id))


def get_auth_service(request: Request):  # noqa: ANN201 — avoids circular import
    return request.app.state.auth_service


def current_user_id(request: Request) -> UUID:
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


def current_role(request: Request) -> str:
    role = getattr(request.state, "role", None)
    if role is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return role
