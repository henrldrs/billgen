r"""Where a rendered document is put, and the rule that it is never read back.

The archive is a **convenience copy**, not the record. `db/` holds the invoice;
this holds a PDF of it. Everything the application answers, it answers from the
database, so a user who deletes, renames or reorganises this folder loses a
copy and changes nothing legal. That one-way relationship is the whole design:
the moment any endpoint reads a file back to decide something, a person with a
file manager is editing a VAT record.

Two operations are what a caller normally gets — `write` and `exists`. There is
a third, `read`, with **exactly one legitimate caller**: the portable backup
(T-28), which has to put the bytes in the archive it hands the user. It is not
a way to answer a question from a file. Everything it returns is checked
against the sha256 the register recorded at issue, so a copy someone edited
comes back named as a mismatch rather than travelling as the original.

The root comes from outside: the desktop passes `app_data_dir()` (T-25), a
hosted deployment passes `DOCUMENT_ROOT`, and where neither says anything the
`NullDocumentArchive` keeps every caller working while writing nothing. A
missing root disables archiving; it never fails an issue.
"""

from __future__ import annotations

import hashlib
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

#  What survives into a filename. Everything else becomes '-': a Belgian
#  reference is free to carry '/' (2026/0001 is a legal series), and a slash in
#  a name is a directory on every filesystem there is.
_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")


class ArchiveError(RuntimeError):
    """The file could not be written. Never fatal to the act being recorded."""


@dataclass(frozen=True)
class ArchivedFile:
    path: str
    sha256: str
    byte_size: int


def safe_name(value: str) -> str:
    """A reference as a filename. Collapses runs of unsafe characters to '-'."""
    cleaned = _UNSAFE.sub("-", value).strip("-.")
    return cleaned or "document"


def sha256_of(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def invoice_path(year: int, reference: str) -> str:
    """`invoices/<year>/<reference>.pdf` — the layout T-27 names."""
    return str(PurePosixPath("invoices") / str(year) / f"{safe_name(reference)}.pdf")


class DocumentArchive(ABC):
    """Somewhere bytes can be put under a relative POSIX path."""

    enabled: bool = True

    @abstractmethod
    def write(self, relative_path: str, payload: bytes) -> ArchivedFile: ...

    @abstractmethod
    def exists(self, relative_path: str) -> bool: ...

    @abstractmethod
    def read(self, relative_path: str) -> bytes | None:
        """The bytes, or None when the file is not there.

        For the portable backup and nothing else — see the module docstring.
        A caller that uses this to *answer* something has broken the rule the
        whole archive is built on.
        """

    @abstractmethod
    def location(self, relative_path: str | None = None) -> str | None:
        """A path to show a person — the settings panel's "open folder"."""


class NullDocumentArchive(DocumentArchive):
    """No root configured. Writes nothing and says so, rather than pretending."""

    enabled = False

    def write(self, relative_path: str, payload: bytes) -> ArchivedFile:
        raise ArchiveError("No document archive is configured (DOCUMENT_ROOT is unset)")

    def exists(self, relative_path: str) -> bool:
        return False

    def read(self, relative_path: str) -> bytes | None:
        return None

    def location(self, relative_path: str | None = None) -> str | None:
        return None


class FilesystemDocumentArchive(DocumentArchive):
    def __init__(self, root: Path | str) -> None:
        self._root = Path(root)

    @property
    def root(self) -> Path:
        return self._root

    def _resolve(self, relative_path: str) -> Path:
        candidate = PurePosixPath(relative_path)
        if candidate.is_absolute() or ".." in candidate.parts or not candidate.parts:
            raise ArchiveError(f"Refusing a document path outside the archive: {relative_path!r}")
        return self._root.joinpath(*candidate.parts)

    def write(self, relative_path: str, payload: bytes) -> ArchivedFile:
        target = self._resolve(relative_path)
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            #  Written beside the target and renamed: a crash mid-write leaves
            #  the previous file, or none, never half a PDF that hashes to
            #  nothing the register knows.
            staging = target.with_name(f".{target.name}.part")
            staging.write_bytes(payload)
            os.replace(staging, target)
        except OSError as exc:
            raise ArchiveError(f"Could not write {relative_path}: {exc}") from exc
        return ArchivedFile(
            path=relative_path, sha256=sha256_of(payload), byte_size=len(payload)
        )

    def exists(self, relative_path: str) -> bool:
        try:
            return self._resolve(relative_path).is_file()
        except ArchiveError:
            return False

    def read(self, relative_path: str) -> bytes | None:
        try:
            return self._resolve(relative_path).read_bytes()
        except (ArchiveError, OSError):
            return None

    def location(self, relative_path: str | None = None) -> str | None:
        if relative_path is None:
            return str(self._root)
        try:
            return str(self._resolve(relative_path))
        except ArchiveError:
            return None
