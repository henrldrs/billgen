from pydantic import BaseModel, Field

from core.backup import MIN_PASSPHRASE_LENGTH


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
    #  Bytes that travelled in the archive and were written back into the
    #  document folder.
    documents_restored: int = 0
    #  Paths the register knows and the folder does not. A restore succeeds
    #  with a non-empty list here: the records are back, some copies are not.
    missing_documents: list[str] = []
    #  Arrived, but did not hash to what was recorded at issue. Written anyway
    #  and named — a copy of unknown provenance beats no copy, as long as
    #  nobody is told it is the original.
    altered_documents: list[str] = []


class EncryptedExportRequest(BaseModel):
    passphrase: str = Field(
        min_length=MIN_PASSPHRASE_LENGTH,
        description=(
            "Never stored, never recoverable. The floor is not a password "
            "policy — it is where the encryption's cost stops mattering "
            "because the whole keyspace can be walked."
        ),
    )
    acknowledge_unrecoverable: bool = Field(
        default=False,
        description=(
            "Must be true. The API refuses to produce an archive nobody can "
            "open unless the caller has said they know that — which is what "
            "turns 'the UI warns first' into something a test can assert."
        ),
    )


class PassphraseNoticeResponse(BaseModel):
    notice: str
    minimum_length: int
