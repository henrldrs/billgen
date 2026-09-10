from pydantic import BaseModel


class RestoreReportResponse(BaseModel):
    companies: int
    clients: int
    products: int
    invoices: int
    quotes: int
    credit_notes: int
    payments: int
    documents: int
    sequences: int
    audit_entries: int
    #  Paths the register knows and the folder does not. A restore succeeds
    #  with a non-empty list here: the records are back, some copies are not.
    missing_documents: list[str] = []
