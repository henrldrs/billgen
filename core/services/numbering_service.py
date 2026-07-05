"""Combines the gapless sequence repository with the pure formatting rules.

Both allocations happen inside the caller's UnitOfWork transaction: the number
is only consumed if the document that uses it commits (gapless guarantee)."""

from datetime import date

from ..models import Client, Company
from ..repository import CREDIT_NOTE_SERIES, INVOICE_SERIES, UnitOfWork, monthly_bucket
from ..rules import format_credit_note_reference, format_display_reference


def allocate_invoice_numbers(
    uow: UnitOfWork, company: Company, client: Client, issue_date: date
) -> tuple[str, int]:
    """Returns (display_reference, sequence_global) for a new invoice."""
    seq_global = uow.sequences.next_value(company.id, INVOICE_SERIES)
    bucket_seq = uow.sequences.next_value(
        company.id, monthly_bucket(client.id, issue_date.year, issue_date.month)
    )
    reference = format_display_reference(
        prefix=company.invoice_reference_prefix,
        client_name=client.name,
        month=issue_date.month,
        seq_in_bucket=bucket_seq,
        year=issue_date.year,
    )
    return reference, seq_global


def allocate_credit_note_numbers(
    uow: UnitOfWork, company: Company, issue_date: date
) -> tuple[str, int]:
    """Returns (reference, sequence_global) for a new credit note."""
    seq_global = uow.sequences.next_value(company.id, CREDIT_NOTE_SERIES)
    reference = format_credit_note_reference(
        prefix=company.invoice_reference_prefix,
        year=issue_date.year,
        seq_global=seq_global,
    )
    return reference, seq_global
