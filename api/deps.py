from collections.abc import Callable
from uuid import UUID

from fastapi import HTTPException, Request

from core.documents import DocumentArchive
from core.repository import UnitOfWork


def get_uow_factory(request: Request) -> Callable[[], UnitOfWork]:
    return request.app.state.uow_factory


def get_document_archive(request: Request) -> DocumentArchive:
    """Where issued documents are written. A NullDocumentArchive when no
    DOCUMENT_ROOT is configured, so callers never branch on None."""
    return request.app.state.document_archive


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
