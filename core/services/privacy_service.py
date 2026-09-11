"""A client is a data subject (T-35): export, erasure, and the consent store.

The line erasure walks is the one the invoice templates draw. They print the
client's name, VAT number, address, postal code, city — and one of them the
contact person — and Belgian law keeps an issued invoice seven years. Blanking
any of those would change what `GET /invoices/{id}/pdf` renders for a document
that is legally frozen, so they stay. Contact channels and free-text notes are
on no invoice, so they go. The register in `core/trust/personal_data.py` says
the same in one word per dataset — `retain` — and the response repeats it,
because a privacy panel that says "delete everything" and keeps seven years of
invoices is the lie this whole surface exists to avoid.

Nothing erased is written to the audit log. The entry records *which fields*
held a value and were blanked, never what they held — an audit trail that
preserved the address it was erasing would be an erasure in name only.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from ..models import AuditAction, ConsentRecord
from ..repository import UnitOfWork
from ..tenancy import current_organization_id
from ..trust import consent, personal_data
from . import _audit
from .errors import BusinessRuleError, NotFoundError

EXPORT_FORMAT = "billgen-privacy-export"

#  What erasure blanks. Not name, VAT number, address, postal code, city or
#  contact person: the invoice templates print those, and the invoice stays.
ERASED_FIELDS: tuple[str, ...] = ("email", "phone", "notes")
RETAINED_FIELDS: tuple[str, ...] = (
    "name",
    "vat_number",
    "address_line1",
    "address_line2",
    "postal_code",
    "city",
    "country_code",
    "contact_person",
)


def _retained_because() -> str:
    invoices = personal_data.dataset("invoices")
    reason = None
    if invoices is not None:
        reason = getattr(invoices, "note", None) or getattr(invoices, "retention", None)
    return str(reason) if reason else (
        "Issued invoices are retained for seven years under Belgian law and print "
        "the client's identity; those fields stay with them."
    )


class PrivacyService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    # ── Article 15 ────────────────────────────────────────────────────────

    def export_client(self, client_id: UUID, actor_user_id: UUID | None = None) -> dict[str, Any]:
        with self._uow_factory() as uow:
            client = uow.clients.get(client_id)
            if client is None:
                raise NotFoundError(f"Client {client_id} not found")
            invoices = uow.invoices.list(client_id=client_id)
            invoice_ids = {invoice.id for invoice in invoices}
            credit_notes = [
                note for note in uow.credit_notes.list() if note.invoice_id in invoice_ids
            ]
            quotes = uow.quotes.list(client_id=client_id)
            payments = [
                payment
                for invoice in invoices
                for payment in uow.payments.list_for_invoice(invoice.id)
            ]
            activity = uow.audit_log.list(
                limit=1000, target_type="client", target_id=client_id
            )
            export = {
                "format": EXPORT_FORMAT,
                "exported_at": datetime.now(UTC),
                "client": client.model_dump(mode="json"),
                "invoices": [i.model_dump(mode="json") for i in invoices],
                "credit_notes": [c.model_dump(mode="json") for c in credit_notes],
                "quotes": [q.model_dump(mode="json") for q in quotes],
                "payments": [p.model_dump(mode="json") for p in payments],
                "activity": [e.model_dump(mode="json") for e in activity],
                "retained": [ds.key for ds in personal_data.retained_on_erasure()],
            }
            _audit.record(
                uow,
                action=AuditAction.PRIVACY_EXPORT,
                target_type="client",
                target_id=client_id,
                after={
                    "invoices": len(invoices),
                    "credit_notes": len(credit_notes),
                    "quotes": len(quotes),
                    "payments": len(payments),
                },
                actor_user_id=actor_user_id,
            )
            uow.commit()
        return export

    # ── Article 17, as far as the invoice allows ──────────────────────────

    def erase_client(self, client_id: UUID, actor_user_id: UUID | None = None) -> dict[str, Any]:
        with self._uow_factory() as uow:
            client = uow.clients.get(client_id)
            if client is None:
                raise NotFoundError(f"Client {client_id} not found")
            held = [f for f in ERASED_FIELDS if getattr(client, f)]
            blanked = client.model_copy(update={field: None for field in ERASED_FIELDS})
            uow.clients.update(blanked)
            invoices_untouched = len(uow.invoices.list(client_id=client_id))
            _audit.record(
                uow,
                action=AuditAction.PRIVACY_ERASE,
                target_type="client",
                target_id=client_id,
                #  Field names only. The values are the thing being erased.
                before={"held": held},
                after={"erased": list(ERASED_FIELDS), "retained": list(RETAINED_FIELDS)},
                actor_user_id=actor_user_id,
            )
            uow.commit()
        return {
            "client_id": client_id,
            "erased": list(ERASED_FIELDS),
            "retained": list(RETAINED_FIELDS),
            "retained_because": _retained_because(),
            "invoices_untouched": invoices_untouched,
        }

    # ── consent ───────────────────────────────────────────────────────────

    def record_consent(
        self,
        user_id: UUID,
        *,
        policy_version: str,
        state: dict[str, bool],
        source: str = "settings",
    ) -> ConsentRecord:
        #  `normalise` fills omissions with defaults and is lenient about the
        #  rest; a decision recorded against a category that does not exist is
        #  a decision about nothing, so unknown keys are refused here.
        known = {category.value for category in consent.ConsentCategory}
        unknown = sorted(key for key in state if key not in known)
        if unknown:
            raise BusinessRuleError(f"Unknown consent category: {', '.join(unknown)}")
        normalised = consent.normalise(state)
        with self._uow_factory() as uow:
            saved = uow.consents.add(
                ConsentRecord(
                    organization_id=current_organization_id(),
                    user_id=user_id,
                    policy_version=policy_version,
                    state={category.value: granted for category, granted in normalised.items()},
                    source=source,
                )
            )
            _audit.record(
                uow,
                action=AuditAction.CONSENT,
                target_type="consent",
                target_id=saved.id,
                after={"policy_version": policy_version, "state": saved.state, "source": source},
                actor_user_id=user_id,
            )
            uow.commit()
            return saved

    def consent_history(self, user_id: UUID) -> list[ConsentRecord]:
        with self._uow_factory() as uow:
            return uow.consents.list_for_user(user_id)
