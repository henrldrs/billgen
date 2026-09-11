"""The guided first run's state, and the two acts that finish it (T-29).

The wizard is a screen; this is the ledger behind it. Nothing here remembers
"which step is open" — that is a browser concern and it is allowed to be lost.
What is *not* allowed to be lost is whether the first run happened, which is a
column on the organization, and whether the person accepted the texts that
gate it, which is a row per text per version.

Two rules the endpoints enforce rather than the screen promising:

- **Completion needs a valid company.** `POST /onboarding/complete` re-runs
  `validate_company_identifiers` on the organization's company and refuses if
  it fails — the same rule set `GET /companies/{id}/validation` uses, not a
  second one the wizard could drift from.
- **Completion needs every required text accepted.** Required means the
  registry says `requires_acceptance` *and* the text is publishable (drafted,
  versioned, with a body). An undrafted text gates nothing, and a step that
  asks a person to accept a title with nothing behind it is the checkbox the
  registry exists to prevent — so with the registry as it stands today, the
  acceptance step is empty and says so.
"""

from __future__ import annotations

import html
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from ..documents import DocumentArchive, safe_name
from ..models import AuditAction, Document, DocumentKind, LegalAcceptance
from ..pdf import render_html
from ..repository import UnitOfWork
from ..tenancy import current_organization_id
from ..trust import legal
from . import _audit, pdf_service
from .company_validation import validate_company_identifiers
from .errors import BusinessRuleError, NotFoundError

CONTRACT_TARGET = "legal_document"

#  What `api/security/auth_service.py`'s desktop bootstrap writes when it mints
#  the local singleton: nobody typed these, and a contract accepted by "Local
#  user" for "My Business" is evidence of nothing. Defined here, in the lower
#  layer, and imported by the writer — one definition, no drift, and
#  `test_onboarding.py` asserts the bootstrap still writes exactly these.
PLACEHOLDER_USER_NAME = "Local user"
PLACEHOLDER_ORGANIZATION_NAME = "My Business"


@dataclass
class RequiredText:
    key: str
    title: str
    version: str
    accepted: bool


@dataclass
class OnboardingStatus:
    completed_at: datetime | None
    #  Who the person is and what they call their business. Placeholders until
    #  the first run asks, and a legal text accepted under a placeholder names
    #  nobody — which is why this blocks completion.
    display_name: str | None
    organization_name: str | None
    profile_complete: bool
    company_id: UUID | None
    company_valid: bool
    company_problems: list[str]
    required_texts: list[RequiredText]
    clients: int
    products: int
    data_directory: str | None
    documents_enabled: bool

    @property
    def texts_outstanding(self) -> list[str]:
        return [text.key for text in self.required_texts if not text.accepted]

    @property
    def can_complete(self) -> bool:
        return (
            self.profile_complete
            and self.company_id is not None
            and self.company_valid
            and not self.texts_outstanding
        )

    #  For the audit entry and the API: what blocks completion, by name.
    def blockers(self) -> list[str]:
        out: list[str] = []
        if not self.profile_complete:
            out.append("profile")
        if self.company_id is None:
            out.append("no company")
        elif not self.company_valid:
            out.extend(f"company: {problem}" for problem in self.company_problems)
        out.extend(f"accept: {key}" for key in self.texts_outstanding)
        return out


def _markdown_blocks(body: str) -> list[dict[str, str]]:
    """Headings and paragraphs, nothing more. A legal text is prose; the one
    piece of structure it needs is `## Section`. Everything is escaped — the
    template's autoescape is on, and this keeps the promise explicit here too."""
    blocks: list[dict[str, str]] = []
    for raw in body.replace("\r\n", "\n").split("\n\n"):
        text = raw.strip()
        if not text:
            continue
        if text.startswith("#"):
            blocks.append({"kind": "heading", "text": html.escape(text.lstrip("#").strip())})
        else:
            blocks.append({"kind": "paragraph", "text": html.escape(text)})
    return blocks


class OnboardingService:
    def __init__(
        self,
        uow_factory: Callable[[], UnitOfWork],
        archive: DocumentArchive | None = None,
    ) -> None:
        self._uow_factory = uow_factory
        self._archive = archive

    # ── reading ───────────────────────────────────────────────────────────

    def status(self, user_id: UUID) -> OnboardingStatus:
        org_id = current_organization_id()
        with self._uow_factory() as uow:
            organization = uow.organizations.get(org_id)
            user = uow.users.get(user_id)
            companies = uow.companies.list()
            company = companies[0] if companies else None
            verdict = validate_company_identifiers(company) if company else None
            accepted = {
                (a.document_key, a.version) for a in uow.legal_acceptances.list_for_user(user_id)
            }
            clients = len(uow.clients.list())
            products = len(uow.products.list())

        required = [
            RequiredText(
                key=doc.key,
                title=doc.title,
                version=doc.version or "",
                accepted=(doc.key, doc.version or "") in accepted,
            )
            for doc in legal.acceptance_required()
            if doc.is_publishable
        ]
        display_name = (user.display_name or "").strip() if user else ""
        organization_name = (organization.name or "").strip() if organization else ""
        return OnboardingStatus(
            completed_at=organization.onboarding_completed_at if organization else None,
            display_name=display_name or None,
            organization_name=organization_name or None,
            profile_complete=(
                bool(display_name)
                and display_name != PLACEHOLDER_USER_NAME
                and bool(organization_name)
                and organization_name != PLACEHOLDER_ORGANIZATION_NAME
            ),
            company_id=company.id if company else None,
            company_valid=bool(verdict and verdict.valid),
            company_problems=(
                [check.field for check in verdict.checks if not check.valid] if verdict else []
            ),
            required_texts=required,
            clients=clients,
            products=products,
            data_directory=self._archive.location() if self._archive else None,
            documents_enabled=bool(self._archive and self._archive.enabled),
        )

    # ── the two acts ──────────────────────────────────────────────────────

    def accept(
        self,
        key: str,
        user_id: UUID,
        *,
        accepted_by: str | None = None,
        source: str = "onboarding",
    ) -> LegalAcceptance:
        """Record that `user_id` accepted the current version of `key`, and put
        the text they accepted into the data folder as a `contract` Document.

        Idempotent per version: accepting the same version twice returns the
        existing record — a second checkbox is not a second fact.
        """
        doc = legal.document(key)
        if doc is None:
            raise NotFoundError(f"No legal document {key!r}")
        if not doc.is_publishable:
            raise BusinessRuleError(
                f"{doc.title} has no published version to accept — the registry "
                "lists it as undrafted"
            )
        version = doc.version or ""
        org_id = current_organization_id()

        with self._uow_factory() as uow:
            for existing in uow.legal_acceptances.list_for_user(user_id):
                if existing.document_key == key and existing.version == version:
                    return existing
            organization = uow.organizations.get(org_id)
            organization_name = organization.name if organization else str(org_id)
            if accepted_by is None:
                user = uow.users.get(user_id)
                accepted_by = (user.display_name or user.email) if user else str(user_id)

        accepted_at = datetime.now(UTC)
        document_id = self._archive_text(
            doc, accepted_by=accepted_by, organization=organization_name, accepted_at=accepted_at,
            actor_user_id=user_id,
        )

        with self._uow_factory() as uow:
            saved = uow.legal_acceptances.add(
                LegalAcceptance(
                    organization_id=org_id,
                    user_id=user_id,
                    document_key=key,
                    version=version,
                    source=source,
                    document_id=document_id,
                )
            )
            _audit.record(
                uow,
                action=AuditAction.ACCEPT_LEGAL,
                target_type="legal_document",
                target_id=saved.id,
                after={"key": key, "version": version, "document_id": str(document_id)},
                actor_user_id=user_id,
            )
            uow.commit()
            return saved

    def complete(self, user_id: UUID) -> OnboardingStatus:
        """Stamp the organization. Refuses, naming every blocker, while the
        company fails validation or a required text is unaccepted."""
        status = self.status(user_id)
        if status.completed_at is not None:
            return status
        if not status.can_complete:
            raise BusinessRuleError(
                "The first run cannot be completed yet: " + "; ".join(status.blockers())
            )
        org_id = current_organization_id()
        with self._uow_factory() as uow:
            organization = uow.organizations.get(org_id)
            if organization is None:
                raise NotFoundError(f"Organization {org_id} not found")
            stamped = organization.model_copy(update={"onboarding_completed_at": datetime.now(UTC)})
            uow.organizations.update(stamped)
            _audit.record(
                uow,
                action=AuditAction.ONBOARDING_COMPLETE,
                target_type="organization",
                target_id=org_id,
                after={
                    "company_id": str(status.company_id),
                    "texts": [t.key for t in status.required_texts],
                },
                actor_user_id=user_id,
            )
            uow.commit()
        return self.status(user_id)

    # ── the accepted text, on disk ────────────────────────────────────────

    def _archive_text(
        self,
        doc: legal.LegalDocument,
        *,
        accepted_by: str,
        organization: str,
        accepted_at: datetime,
        actor_user_id: UUID,
    ) -> UUID | None:
        """The text as accepted, rendered and registered — or None with no
        archive configured, in which case the database row is still the proof."""
        if self._archive is None or not self._archive.enabled:
            return None
        rendered = render_html(
            "legal_document.html",
            {
                "lang": "en",
                "title": doc.title,
                "version": doc.version,
                "effective_date": doc.effective_date.isoformat() if doc.effective_date else None,
                "product": "BillGen",
                "blocks": _markdown_blocks(doc.body or ""),
                "accepted_by": accepted_by,
                "organization": organization,
                "accepted_at": accepted_at.strftime("%d/%m/%Y %H:%M UTC"),
            },
        )
        #  Through pdf_service, not core.pdf directly: it is the one seam the
        #  suite stubs, and a second import path would print through the real
        #  Edge under test.
        pdf = pdf_service.html_to_pdf(rendered)
        #  One file per person per version: two users accepting the same text
        #  are two acceptances, and neither may overwrite the other's copy.
        version = safe_name(doc.version or "0")
        path = f"contracts/{safe_name(doc.key)}-v{version}-{actor_user_id}.pdf"
        written = self._archive.write(path, pdf)
        with self._uow_factory() as uow:
            saved = uow.documents.add(
                Document(
                    organization_id=current_organization_id(),
                    kind=DocumentKind.CONTRACT,
                    path=written.path,
                    sha256=written.sha256,
                    byte_size=written.byte_size,
                    target_type=CONTRACT_TARGET,
                    target_id=actor_user_id,
                )
            )
            _audit.record(
                uow,
                action=AuditAction.ARCHIVE_DOCUMENT,
                target_type="document",
                target_id=saved.id,
                after={"path": saved.path, "sha256": saved.sha256, "legal": doc.key},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved.id
