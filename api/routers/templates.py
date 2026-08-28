"""Document templates — the backend the Template Studio scaffold was missing.

`GET /pdf-templates` still lists the four fixed Jinja templates in
`core/pdf/registry.py` and is untouched. This router is the editable layer above
it: an organization's own block-based templates, versioned, with the snapshot an
issued invoice keeps.

Two refusals are enforced before a handler runs, by the schemas:

* appearance takes **token names, never colours** — a hex in a database row is
  the palette bypass the guard test cannot see;
* a template must **show the blocks an invoice is legally required to display**,
  so hiding totals is a 422 rather than a styling choice.

Two independent gates, and they are not the same question:

* **`template.write`** — an admin permission rather than a member one. A
  template changes how every future document looks to every customer; that is
  the organization's own record, not its day-to-day trade. Refusal is 403.
* **`pdf_templates_premium`** — the plan. The visual designer is a Business-tier
  feature (false on free and starter, true on business and above), which is the
  audit specification's §10 split: standard templates for everyone, the designer
  above. Refusal is 402 with an upgrade path.

Reads are deliberately **not** gated on the plan. An organization that downgrades
keeps the templates it built, and the settings screen has to be able to show them
with an upgrade prompt rather than a wall — and every invoice already issued
renders from its own snapshot regardless of tier.
"""

from collections.abc import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from core.models.template import DocumentTemplate
from core.repository import UnitOfWork
from core.services import TemplateService
from core.tenancy import current_organization_id

from ..authz import Permission, require_permission
from ..deps import current_user_id, get_uow_factory
from ..entitlements import require_feature
from ..schemas.templates import (
    TemplateCreateRequest,
    TemplateResponse,
    TemplateSnapshotResponse,
    TemplateUpdateRequest,
)

router = APIRouter(prefix="/templates", tags=["templates"])


def _to_response(template: DocumentTemplate) -> TemplateResponse:
    return TemplateResponse(
        **template.model_dump(),
        is_published=template.is_published,
    )


@router.get("", response_model=list[TemplateResponse])
def list_templates(
    company_id: UUID | None = None,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return [
        _to_response(t) for t in TemplateService(uow_factory).list(company_id=company_id)
    ]


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(TemplateService(uow_factory).get(template_id))


@router.get("/{template_id}/snapshot", response_model=TemplateSnapshotResponse)
def get_snapshot(
    template_id: UUID,
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """The published version an invoice would store if issued now.

    404s while the template has never been published, which is the honest answer
    — there is no version to attach, and inventing one from the draft is exactly
    the mutable-layout failure the snapshot prevents.
    """
    snapshot = TemplateService(uow_factory).snapshot_for(template_id)
    return TemplateSnapshotResponse(**snapshot.model_dump())


@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(
    body: TemplateCreateRequest,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.TEMPLATE_WRITE)),
    __: None = Depends(require_feature("pdf_templates_premium")),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    template = TemplateService(uow_factory).create(
        organization_id=current_organization_id(),
        company_id=body.company_id,
        name=body.name,
        blocks=body.blocks,
        appearance=body.appearance,
        is_default=body.is_default,
        actor_id=user_id,
    )
    return _to_response(template)


@router.patch("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: UUID,
    body: TemplateUpdateRequest,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.TEMPLATE_WRITE)),
    __: None = Depends(require_feature("pdf_templates_premium")),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Edit the draft. Published versions are untouched — that is the point."""
    template = TemplateService(uow_factory).update(
        template_id,
        name=body.name,
        blocks=body.blocks,
        appearance=body.appearance,
        actor_id=user_id,
    )
    return _to_response(template)


@router.post("/{template_id}/publish", response_model=TemplateResponse)
def publish_template(
    template_id: UUID,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.TEMPLATE_WRITE)),
    __: None = Depends(require_feature("pdf_templates_premium")),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Freeze the draft as an immutable version.

    Only a published version can reach a document, which is what makes "which
    layout did this customer actually receive" answerable a year later.
    """
    return _to_response(TemplateService(uow_factory).publish(template_id, actor_id=user_id))


@router.post("/{template_id}/default", response_model=TemplateResponse)
def set_default_template(
    template_id: UUID,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.TEMPLATE_WRITE)),
    __: None = Depends(require_feature("pdf_templates_premium")),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    return _to_response(
        TemplateService(uow_factory).set_default(template_id, actor_id=user_id)
    )


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: UUID,
    user_id: UUID = Depends(current_user_id),
    _: None = Depends(require_permission(Permission.TEMPLATE_WRITE)),
    __: None = Depends(require_feature("pdf_templates_premium")),
    uow_factory: Callable[[], UnitOfWork] = Depends(get_uow_factory),
):
    """Safe because invoices keep their template by value.

    Refused only for the company default: a company with templates and no
    default is a state the issue path has no answer for.
    """
    TemplateService(uow_factory).delete(template_id, actor_id=user_id)
    return Response(status_code=204)
