from datetime import date
from uuid import UUID

from pydantic import BaseModel


class AlertResponse(BaseModel):
    """`code` is the rule that fired and doubles as the translation key;
    `context` carries the numbers the sentence needs. No prose: the wording is
    the frontend's, in the user's language."""

    code: str
    severity: str
    target_type: str
    target_id: UUID
    title: str
    context: dict


class AlertsResponse(BaseModel):
    company_id: UUID
    as_of: date
    alerts: list[AlertResponse]
    # Counts cover every alert that fired, while `alerts` is capped — a badge
    # reading 8 above a list of 5 is correct, and better than one that lies to
    # match the page.
    counts_by_severity: dict[str, int]
    counts_by_code: dict[str, int]
    truncated: bool
