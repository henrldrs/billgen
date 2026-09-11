"""A person accepted a versioned legal text. The record, not the checkbox.

`core/trust/legal.py` says which documents *require* acceptance and which
version is current; this is the row that proves a given user accepted a given
version at a given moment. A term nobody can prove was shown is a term you do
not have — that sentence is in the registry, and this is the table it asks for.

`document_id` points at the T-27 `Document` holding the rendered text she
accepted, written into her data folder as kind `contract` so it lands in her
backup. The acceptance is per user *and* per organization: on the desktop they
coincide; on a host an admin accepting for one organization has accepted for
nobody else.
"""

from uuid import UUID

from pydantic import Field

from ._base import TenantModel


class LegalAcceptance(TenantModel):
    user_id: UUID
    document_key: str = Field(min_length=1, max_length=32)
    version: str = Field(min_length=1, max_length=32)
    #  Where it was accepted: the first-run wizard, or a later settings screen.
    source: str = Field(default="onboarding", pattern="^(onboarding|settings)$")
    document_id: UUID | None = None
