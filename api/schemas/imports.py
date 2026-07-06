"""Wire DTOs for the import endpoints — kept separate from core's ImportReport
so the HTTP contract doesn't leak the internal result object (same convention as
KpiResponse vs. core KpiSummary)."""

from pydantic import BaseModel


class ImportEntityCounts(BaseModel):
    created: int
    skipped: int
    failed: int


class ImportIssue(BaseModel):
    entity: str
    name: str
    reason: str


class ImportReportResponse(BaseModel):
    dry_run: bool
    companies: ImportEntityCounts
    clients: ImportEntityCounts
    products: ImportEntityCounts
    invoices_detected: int
    issues: list[ImportIssue]
