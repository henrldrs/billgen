"""The register of files written outside the database (T-27).

There is deliberately **no download endpoint**. The archive is written and
never read: an invoice is served by rendering it from the database, so a file
someone edited in a folder can never come back through the API as the record.
What this router offers is the register — where files went, what they hashed
to — and the one-shot that fills in what is missing.
"""

from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.documents import DocumentArchive
from core.models import DocumentKind
from core.repository import UnitOfWork
from core.services import DocumentService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_document_archive, get_uow_factory
from ..entitlements import pdf_branded
from ..schemas.documents import (
    DocumentListResponse,
    DocumentResponse,
    RebuildReportResponse,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
def list_documents(
    kind: str | None = Query(default=None, description="invoice | contract | policy | other"),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
):
    """Every registered document, newest first, plus the resolved archive root."""
    selected = DocumentKind(kind) if kind else None
    service = DocumentService(uow_factory, archive)
    return DocumentListResponse(
        root=archive.location(),
        documents=[
            DocumentResponse.model_validate(document.model_dump())
            for document in service.list(selected)
        ],
    )


@router.post("/rebuild", response_model=RebuildReportResponse)
def rebuild_documents(
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
    branded: bool = Depends(pdf_branded),
    _perm: None = Depends(require_permission(Permission.DOCUMENT_REBUILD)),
):
    """Give every issued invoice a file: the one-shot for a history that
    predates T-27, and the repair for a file someone deleted.

    Re-rendering runs today's template over an old invoice, so bytes can differ
    from the hash first recorded. That is counted as `rehashed` — the register
    stays honest about which copies are no longer the originals."""
    report = DocumentService(uow_factory, archive, branded=branded).rebuild(
        actor_user_id=user_id
    )
    return RebuildReportResponse(**report.__dict__)
