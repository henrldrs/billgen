from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PrivacyExportResponse(BaseModel):
    """Everything held about one client, as the controller would hand it to
    the data subject (Article 15). Shaped for reading, not for restore."""

    format: str
    exported_at: datetime
    client: dict[str, Any]
    invoices: list[dict[str, Any]]
    credit_notes: list[dict[str, Any]]
    quotes: list[dict[str, Any]]
    payments: list[dict[str, Any]]
    activity: list[dict[str, Any]]
    #  What the register says is retained regardless, said in the export too.
    retained: list[str]


class PrivacyEraseResponse(BaseModel):
    client_id: UUID
    #  Field names blanked, and field names kept — the kept ones because the
    #  invoices print them and Belgian law keeps invoices seven years.
    erased: list[str]
    retained: list[str]
    retained_because: str
    invoices_untouched: int


class ConsentRequest(BaseModel):
    policy_version: str = Field(min_length=1, max_length=32)
    #  Category key → granted. Omitted categories take their default (off,
    #  except essential); unknown keys are refused.
    state: dict[str, bool]
    source: str = Field(default="settings", pattern="^(banner|settings|onboarding)$")


class ConsentRecordResponse(BaseModel):
    id: UUID
    policy_version: str
    state: dict[str, bool]
    source: str
    created_at: datetime


class ConsentStatusResponse(BaseModel):
    current: ConsentRecordResponse | None
    history: list[ConsentRecordResponse]
