"""The guided first run's ledger (T-29): what it has, what it lacks, and the
two acts that finish it. The wizard is a screen in `frontend-react`; nothing
about whether the first run happened lives there.
"""

from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends

from core.documents import DocumentArchive
from core.repository import UnitOfWork
from core.services import OnboardingService

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_document_archive, get_uow_factory
from ..schemas.onboarding import (
    AcceptanceResponse,
    AcceptRequest,
    OnboardingStatusResponse,
    RequiredTextResponse,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def _status(status) -> OnboardingStatusResponse:  # noqa: ANN001
    return OnboardingStatusResponse(
        completed_at=status.completed_at,
        display_name=status.display_name,
        organization_name=status.organization_name,
        profile_complete=status.profile_complete,
        company_id=status.company_id,
        company_valid=status.company_valid,
        company_problems=status.company_problems,
        required_texts=[
            RequiredTextResponse(
                key=t.key, title=t.title, version=t.version, accepted=t.accepted
            )
            for t in status.required_texts
        ],
        clients=status.clients,
        products=status.products,
        data_directory=status.data_directory,
        documents_enabled=status.documents_enabled,
        can_complete=status.can_complete,
        blockers=status.blockers(),
    )


@router.get("", response_model=OnboardingStatusResponse)
def onboarding_status(
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
):
    """Derived, every call. `completed_at` is the one fact the shell needs to
    decide whether to show the wizard; the rest is what the wizard shows."""
    return _status(OnboardingService(uow_factory, archive).status(user_id))


@router.post("/acceptances", response_model=AcceptanceResponse, status_code=201)
def accept_legal_text(
    body: AcceptRequest,
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
):
    """Accept the current version of a published legal text.

    No permission is declared, on purpose: the identity acted on is the
    caller's own, from the token, and every role — a viewer included — must be
    able to accept the terms she is shown. The text she accepted is written to
    the data folder as a `contract` Document, so it is in her backup."""
    accepted = OnboardingService(uow_factory, archive).accept(
        body.key, user_id, source=body.source
    )
    return AcceptanceResponse.model_validate(accepted.model_dump())


@router.post("/complete", response_model=OnboardingStatusResponse)
def complete_onboarding(
    user_id: UUID = Depends(current_user_id),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
    archive: DocumentArchive = Depends(get_document_archive),
    _perm: None = Depends(require_permission(Permission.COMPANY_WRITE)),
):
    """Stamp the first run as done. 409 while the company fails validation or
    a required text is unaccepted — the response names each blocker."""
    return _status(OnboardingService(uow_factory, archive).complete(user_id))
