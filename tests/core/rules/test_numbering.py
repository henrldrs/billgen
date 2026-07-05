import re

import pytest

from core.rules import (
    client_initials,
    format_credit_note_reference,
    format_display_reference,
)


def test_initials_two_words():
    assert client_initials("Big Corp") == "BC"


def test_initials_single_word_takes_first_two_chars():
    assert client_initials("BigCorp") == "BI"


def test_initials_three_words_takes_first_two():
    assert client_initials("Big Corp NV") == "BC"


def test_initials_diacritics_folded():
    assert client_initials("Élise") == "EL"
    assert client_initials("François Étienne") == "FE"


def test_initials_empty_string_returns_XX():
    assert client_initials("") == "XX"


def test_initials_punctuation_only_returns_XX():
    assert client_initials("---") == "XX"


def test_initials_short_word_padded_with_X():
    assert client_initials("A") == "AX"


def test_initials_length_configurable():
    assert client_initials("Big Corp NV", length=3) == "BCN"


def test_display_reference_matches_legacy_pattern():
    ref = format_display_reference(
        prefix="ACME-",
        client_name="Big Corp",
        month=7,
        seq_in_bucket=4,
        year=2026,
    )
    assert ref == "ACME-BC07042026"
    assert re.fullmatch(r"ACME-[A-Z]{2}\d{2}\d{2}\d{4}", ref)


def test_display_reference_100th_grows_past_two_digits():
    ref = format_display_reference(
        prefix="ACME-",
        client_name="Big Corp",
        month=7,
        seq_in_bucket=100,
        year=2026,
    )
    assert ref == "ACME-BC071002026"


def test_display_reference_rejects_bad_month():
    with pytest.raises(ValueError):
        format_display_reference(
            prefix="", client_name="X", month=13, seq_in_bucket=1, year=2026
        )


def test_display_reference_rejects_zero_seq():
    with pytest.raises(ValueError):
        format_display_reference(
            prefix="", client_name="X", month=1, seq_in_bucket=0, year=2026
        )


def test_credit_note_reference_padded_four_digits():
    ref = format_credit_note_reference(prefix="ACME-", year=2026, seq_global=7)
    assert ref == "CN-ACME-2026/0007"


def test_credit_note_reference_rejects_zero_seq():
    with pytest.raises(ValueError):
        format_credit_note_reference(prefix="", year=2026, seq_global=0)
