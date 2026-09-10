from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: UUID
    kind: str
    path: str
    sha256: str
    byte_size: int
    target_type: str | None = None
    target_id: UUID | None = None
    created_at: datetime


class DocumentListResponse(BaseModel):
    #  The resolved archive root, not a configured one: the settings panel has
    #  to show where files actually went (T-29 asserts this rather than
    #  hard-coding a path). None when archiving is off.
    root: str | None = None
    documents: list[DocumentResponse]


class RebuildReportResponse(BaseModel):
    written: int
    skipped: int
    failed: int
    rehashed: int
    errors: list[str]
