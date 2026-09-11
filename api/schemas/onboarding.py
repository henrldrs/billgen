from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RequiredTextResponse(BaseModel):
    key: str
    title: str
    version: str
    accepted: bool


class OnboardingStatusResponse(BaseModel):
    """What the first run has and lacks. Derived on every call — nothing here
    is a step counter the browser could get out of sync with."""

    completed_at: datetime | None
    company_id: UUID | None
    company_valid: bool
    #  Field names from `validate_company_identifiers`, so the wizard can point
    #  at the input rather than say "something is wrong".
    company_problems: list[str]
    required_texts: list[RequiredTextResponse]
    clients: int
    products: int
    #  The resolved folder her data lives in, shown rather than hard-coded
    #  (T-29's done-when); None when archiving is off.
    data_directory: str | None
    documents_enabled: bool
    can_complete: bool
    blockers: list[str]


class AcceptRequest(BaseModel):
    key: str = Field(min_length=1, max_length=32)
    source: str = Field(default="onboarding", pattern="^(onboarding|settings)$")


class AcceptanceResponse(BaseModel):
    id: UUID
    document_key: str
    version: str
    source: str
    document_id: UUID | None
    created_at: datetime
