"""Result of an import run — the same shape for a dry-run preview and a real
commit, so the UI can show exactly what will happen before it happens."""

from pydantic import BaseModel


class ImportEntityCounts(BaseModel):
    created: int = 0
    skipped: int = 0
    failed: int = 0


class ImportIssue(BaseModel):
    entity: str  # "company" | "client" | "product"
    name: str
    reason: str


class ImportReport(BaseModel):
    """`dry_run=True` means nothing was written; the counts are a prediction.
    `created`/`skipped`/`failed` sum to the number of source rows seen. Duplicates
    (already present, or repeated within the file) count as `skipped`."""

    dry_run: bool
    companies: ImportEntityCounts = ImportEntityCounts()
    clients: ImportEntityCounts = ImportEntityCounts()
    products: ImportEntityCounts = ImportEntityCounts()
    invoices_detected: int = 0  # found in the backup but not imported in v1
    issues: list[ImportIssue] = []
