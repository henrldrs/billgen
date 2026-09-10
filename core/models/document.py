"""A file this organization is legally expected to still have in seven years.

The row is a *register*, not the file: it records where a document was written,
how big it was and what its bytes hashed to. The database stays authoritative —
nothing in the application reads a file back to answer a question — so a person
tidying the folder can lose a copy but can never edit the legal record.

The hash is what makes that division useful rather than merely safe: a restore
can say "this file is missing" or "this file is not the one that was issued"
without ever having trusted it.
"""

from enum import Enum
from uuid import UUID

from pydantic import Field

from ._base import TenantModel


class DocumentKind(str, Enum):
    INVOICE = "invoice"
    CONTRACT = "contract"
    POLICY = "policy"
    OTHER = "other"


class Document(TenantModel):
    kind: DocumentKind
    #  Relative to the archive root and always POSIX-separated, so a backup
    #  taken on one machine names the same file on another.
    path: str = Field(min_length=1, max_length=512)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    byte_size: int = Field(ge=0)
    #  What the document is *of*, when it is of something. A contract or a
    #  policy is of nothing — it belongs to the organization itself.
    target_type: str | None = Field(default=None, max_length=64)
    target_id: UUID | None = None
