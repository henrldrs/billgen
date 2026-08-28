"""Document templates: draft, publish, snapshot.

The service exists to hold three rules that a repository cannot and a router
must not:

**Exactly one default per company.** Enforced here rather than by a partial
unique index, because SQLite's support for those is version-dependent and the
desktop build is the one target that cannot be upgraded on demand.

**Publishing is the only way a template becomes usable on a document.** A draft
is whatever the studio last saved; a published version is immutable. An invoice
may only snapshot a published version, which is what makes "which layout did the
customer actually receive" answerable a year later.

**Deleting is allowed, and safe, precisely because of the snapshot.** Invoices
carry their template by value, so removing a template cannot restyle or break a
document already sent. The one refusal is the company default, because leaving a
company with no default is a state the issue path has no answer for.
"""

from collections.abc import Callable
from uuid import UUID

from ..models import AuditAction
from ..models.template import (
    DocumentTemplate,
    TemplateAppearance,
    TemplateBlock,
    TemplateSnapshot,
)
from ..repository import UnitOfWork
from . import _audit
from .errors import BusinessRuleError, NotFoundError


class TemplateService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    # -- reads ---------------------------------------------------------

    def list(self, company_id: UUID | None = None) -> list[DocumentTemplate]:
        with self._uow_factory() as uow:
            return uow.templates.list(company_id=company_id)

    def get(self, template_id: UUID) -> DocumentTemplate:
        with self._uow_factory() as uow:
            template = uow.templates.get(template_id)
        if template is None:
            raise NotFoundError(f"Template {template_id} not found")
        return template

    def snapshot_for(self, template_id: UUID) -> TemplateSnapshot:
        """The snapshot an invoice should store when issued with this template."""
        with self._uow_factory() as uow:
            template = uow.templates.get(template_id)
            if template is None:
                raise NotFoundError(f"Template {template_id} not found")
            if template.published_version is None:
                raise BusinessRuleError(
                    f"Template {template.name!r} has never been published, so there "
                    f"is no version to attach to a document."
                )
            snapshot = uow.templates.snapshot_of(template_id, template.published_version)
        if snapshot is None:
            raise BusinessRuleError(
                f"Template {template.name!r} claims version "
                f"{template.published_version} but that version is not stored."
            )
        return snapshot

    # -- writes --------------------------------------------------------

    def create(
        self,
        organization_id: UUID,
        company_id: UUID,
        *,
        name: str,
        blocks: list[TemplateBlock] | None = None,
        appearance: TemplateAppearance | None = None,
        is_default: bool = False,
        actor_id: UUID | None = None,
    ) -> DocumentTemplate:
        template = DocumentTemplate(
            organization_id=organization_id,
            company_id=company_id,
            name=name,
            is_default=is_default,
            **({"blocks": blocks} if blocks is not None else {}),
            **({"appearance": appearance} if appearance is not None else {}),
        )
        with self._uow_factory() as uow:
            #  The first template for a company becomes its default whatever the
            #  caller asked for. A company with templates and no default is a
            #  state the issue path cannot resolve.
            existing = uow.templates.list(company_id=company_id)
            if not existing:
                template.is_default = True
            elif template.is_default:
                uow.templates.clear_default(company_id)

            stored = uow.templates.add(template)
            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.CREATE,
                target_type="document_template",
                target_id=stored.id,
                after={"name": stored.name, "is_default": stored.is_default},
            )
            uow.commit()
        return stored

    def update(
        self,
        template_id: UUID,
        *,
        name: str | None = None,
        blocks: list[TemplateBlock] | None = None,
        appearance: TemplateAppearance | None = None,
        actor_id: UUID | None = None,
    ) -> DocumentTemplate:
        """Edit the draft. Published versions are untouched — that is the point."""
        with self._uow_factory() as uow:
            template = uow.templates.get(template_id)
            if template is None:
                raise NotFoundError(f"Template {template_id} not found")

            before = {"name": template.name, "version": template.published_version}
            if name is not None:
                template.name = name
            if blocks is not None:
                template.blocks = blocks
            if appearance is not None:
                template.appearance = appearance

            stored = uow.templates.update(template)
            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.UPDATE,
                target_type="document_template",
                target_id=template_id,
                before=before,
                after={"name": stored.name},
            )
            uow.commit()
        return stored

    def publish(self, template_id: UUID, *, actor_id: UUID | None = None) -> DocumentTemplate:
        with self._uow_factory() as uow:
            template = uow.templates.get(template_id)
            if template is None:
                raise NotFoundError(f"Template {template_id} not found")
            stored = uow.templates.publish(template)
            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.UPDATE,
                target_type="document_template",
                target_id=template_id,
                after={"published_version": stored.published_version},
            )
            uow.commit()
        return stored

    def set_default(self, template_id: UUID, *, actor_id: UUID | None = None) -> DocumentTemplate:
        with self._uow_factory() as uow:
            template = uow.templates.get(template_id)
            if template is None:
                raise NotFoundError(f"Template {template_id} not found")
            uow.templates.clear_default(template.company_id)
            template.is_default = True
            stored = uow.templates.update(template)
            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.UPDATE,
                target_type="document_template",
                target_id=template_id,
                after={"is_default": True},
            )
            uow.commit()
        return stored

    def delete(self, template_id: UUID, *, actor_id: UUID | None = None) -> None:
        with self._uow_factory() as uow:
            template = uow.templates.get(template_id)
            if template is None:
                raise NotFoundError(f"Template {template_id} not found")
            if template.is_default:
                raise BusinessRuleError(
                    "The default template cannot be deleted. Make another template "
                    "the default first — a company with no default has no answer "
                    "for the next invoice it issues."
                )
            uow.templates.delete(template_id)
            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.DELETE,
                target_type="document_template",
                target_id=template_id,
                before={"name": template.name},
            )
            uow.commit()
