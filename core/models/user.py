from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import DomainModel, IdentifiedModel


class Role(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class User(IdentifiedModel):
    email: str = Field(min_length=3, max_length=320)
    display_name: str = Field(min_length=1, max_length=200)
    email_verified: bool = False
    is_active: bool = True

    #  The language of the *interface*, which is not the language of the
    #  documents. `Company.default_language` decides what an invoice is written
    #  in — a business fact about the customer being billed. This decides what
    #  the person operating the software reads, and a Belgian company issuing
    #  French invoices may well employ a Dutch-speaking bookkeeper. Conflating
    #  them means one of the two is always wrong for somebody.
    #
    #  Null means "not chosen": the interface falls back to the company default,
    #  then the browser, then French. A stored default would make "I never
    #  picked one" indistinguishable from "I picked French".
    language: str | None = Field(default=None, pattern=r"^(en|fr|nl|es)$")


class OrgMembership(DomainModel):
    organization_id: UUID
    user_id: UUID
    role: Role = Role.MEMBER
