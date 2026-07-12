from pydantic import BaseModel


class RestoreReportResponse(BaseModel):
    companies: int
    clients: int
    products: int
    invoices: int
    credit_notes: int
    payments: int
    sequences: int
    audit_entries: int
