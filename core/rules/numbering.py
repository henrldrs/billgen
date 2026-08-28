import re
import unicodedata

_NON_ALNUM = re.compile(r"[^A-Za-z0-9]+")


def _ascii_fold(text: str) -> str:
    """Best-effort remove diacritics: 'Élise' → 'Elise'."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c)
    )


def client_initials(client_name: str, *, length: int = 2) -> str:
    """First `length` uppercase alphanumeric chars derived from client_name.

    Rules:
      - Multi-word names: take the first letter of each word.
      - Single-word names: take the first `length` letters.
      - Diacritics folded ('Élise' → 'EL').
      - Empty / non-alphanumeric input: return 'X' * length.
      - Short results are right-padded with 'X'.
    """
    if not client_name:
        return "X" * length

    normalized = _ascii_fold(client_name).strip()
    words = [w for w in _NON_ALNUM.split(normalized) if w]
    if not words:
        return "X" * length

    if len(words) == 1:
        core = words[0][:length].upper()
    else:
        core = "".join(w[0] for w in words[:length]).upper()

    core = "".join(c for c in core if c.isascii() and c.isalnum())
    return (core + "X" * length)[:length]


def format_display_reference(
    *,
    prefix: str,
    client_name: str,
    month: int,
    seq_in_bucket: int,
    year: int,
) -> str:
    """Legacy display reference: {prefix}{clientInitials(2)}{MM}{seq(2..)}{YYYY}.

    seq_in_bucket >= 100 grows past the 2-digit width naturally (audit finding C-13).
    """
    if not (1 <= month <= 12):
        raise ValueError(f"month must be 1..12, got {month}")
    if seq_in_bucket < 1:
        raise ValueError(f"seq_in_bucket must be >= 1, got {seq_in_bucket}")
    if not (1000 <= year <= 9999):
        raise ValueError(f"year must be 4 digits, got {year}")

    initials = client_initials(client_name)
    seq_str = f"{seq_in_bucket:02d}" if seq_in_bucket < 100 else str(seq_in_bucket)
    return f"{prefix}{initials}{month:02d}{seq_str}{year}"


def format_credit_note_reference(
    *,
    prefix: str,
    year: int,
    seq_global: int,
) -> str:
    """Credit-note reference format: CN-{prefix}{YYYY}/{NNNN}."""
    if seq_global < 1:
        raise ValueError(f"seq_global must be >= 1, got {seq_global}")
    if not (1000 <= year <= 9999):
        raise ValueError(f"year must be 4 digits, got {year}")
    return f"CN-{prefix}{year}/{seq_global:04d}"


def format_quote_reference(*, prefix: str, year: int, seq_global: int) -> str:
    """Quote reference format: Q-{prefix}{YYYY}/{NNNN}.

    Visibly not an invoice number. A customer holding both should never have to
    work out which document they are looking at, and neither should the person
    reading it back over the phone.
    """
    if seq_global < 1:
        raise ValueError(f"seq_global must be >= 1, got {seq_global}")
    if not (1000 <= year <= 9999):
        raise ValueError(f"year must be 4 digits, got {year}")
    return f"Q-{prefix}{year}/{seq_global:04d}"
