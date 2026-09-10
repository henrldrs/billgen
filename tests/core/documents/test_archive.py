"""The archive port: where bytes go, and the two things it refuses to do."""

import pytest

from core.documents import (
    ArchiveError,
    FilesystemDocumentArchive,
    NullDocumentArchive,
    invoice_path,
    safe_name,
    sha256_of,
)


def test_invoice_path_layout():
    assert invoice_path(2026, "ACME-0001") == "invoices/2026/ACME-0001.pdf"


def test_a_reference_with_a_slash_does_not_become_a_directory():
    """Belgian series are written 2026/0001 often enough that this is not
    hypothetical, and a '/' in a filename is a folder on every filesystem."""
    assert safe_name("2026/0001") == "2026-0001"
    assert invoice_path(2026, "2026/0001") == "invoices/2026/2026-0001.pdf"


def test_write_then_exists(tmp_path):
    archive = FilesystemDocumentArchive(tmp_path)
    written = archive.write("invoices/2026/A-1.pdf", b"%PDF-1.7 hello")

    assert (tmp_path / "invoices" / "2026" / "A-1.pdf").read_bytes() == b"%PDF-1.7 hello"
    assert written.sha256 == sha256_of(b"%PDF-1.7 hello")
    assert written.byte_size == 14
    assert archive.exists("invoices/2026/A-1.pdf")
    assert not archive.exists("invoices/2026/nothing.pdf")


def test_write_leaves_no_staging_file_behind(tmp_path):
    archive = FilesystemDocumentArchive(tmp_path)
    archive.write("invoices/2026/A-1.pdf", b"x")
    folder = tmp_path / "invoices" / "2026"
    assert [entry.name for entry in folder.iterdir()] == ["A-1.pdf"]


@pytest.mark.parametrize("path", ["../escape.pdf", "invoices/../../escape.pdf", "/etc/passwd"])
def test_paths_cannot_leave_the_root(tmp_path, path):
    archive = FilesystemDocumentArchive(tmp_path)
    with pytest.raises(ArchiveError):
        archive.write(path, b"x")
    assert archive.exists(path) is False


def test_null_archive_is_disabled_and_says_so():
    archive = NullDocumentArchive()
    assert archive.enabled is False
    assert archive.location() is None
    assert archive.exists("invoices/2026/A-1.pdf") is False
    with pytest.raises(ArchiveError):
        archive.write("invoices/2026/A-1.pdf", b"x")
