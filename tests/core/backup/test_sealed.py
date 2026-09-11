"""The sealed container (T-28).

The properties asserted here are the ones a person's data rests on: the right
passphrase opens it, a wrong one does not, and editing the readable header
cannot make either easier.
"""

import json
import struct

import pytest

from core.backup import sealed

PASSPHRASE = "correct horse battery staple"
PLAINTEXT = b"every client's name, address and VAT number"


def test_a_sealed_archive_opens_with_its_passphrase():
    blob = sealed.seal(PLAINTEXT, PASSPHRASE)
    assert sealed.unseal(blob, PASSPHRASE) == PLAINTEXT


def test_the_plaintext_is_not_in_the_file():
    """The whole point, and worth asserting rather than assuming: a compression
    or framing mistake that left the payload readable would pass every other
    test in this file."""
    blob = sealed.seal(PLAINTEXT, PASSPHRASE)
    assert PLAINTEXT not in blob
    assert b"VAT" not in blob


def test_a_wrong_passphrase_is_refused_and_says_so_once():
    blob = sealed.seal(PLAINTEXT, PASSPHRASE)
    with pytest.raises(sealed.WrongPassphraseError) as refused:
        sealed.unseal(blob, "correct horse battery stapl")
    assert "cannot recover" in str(refused.value) or "no way to recover" in str(refused.value)


def test_two_seals_of_the_same_payload_differ():
    """Fresh salt and nonce each time. Identical ciphertexts would leak that
    nothing changed between two backups, and reuse a nonce under one key —
    which is the way to break AES-GCM outright."""
    first = sealed.seal(PLAINTEXT, PASSPHRASE)
    second = sealed.seal(PLAINTEXT, PASSPHRASE)
    assert first != second
    assert sealed.read_header(first)["nonce"] != sealed.read_header(second)["nonce"]
    assert sealed.read_header(first)["salt"] != sealed.read_header(second)["salt"]


def test_the_header_is_readable_without_the_passphrase():
    """A restore has to know it needs a passphrase before asking for one, and a
    person in three years has to be able to see what the file is."""
    blob = sealed.seal(PLAINTEXT, PASSPHRASE, extra={"invoices": 42})

    assert sealed.is_sealed(blob)
    header = sealed.read_header(blob)
    assert header["format"] == sealed.SEALED_FORMAT
    assert header["cipher"] == "AES-256-GCM"
    assert header["kdf"] == "scrypt"
    assert header["invoices"] == 42
    assert "cannot be recovered" in header["notice"]


def test_weakening_the_header_breaks_the_file_instead_of_the_encryption():
    """The header is readable, so it must not be *authoritative* on its own.
    It is the AAD: an attacker who rewrites scrypt's cost down to 2 gets a
    decryption failure, not a cheaper file to attack."""
    blob = sealed.seal(PLAINTEXT, PASSPHRASE)
    header = sealed.read_header(blob)
    header["n"] = 2
    forged_header = json.dumps(header, ensure_ascii=False).encode("utf-8")
    original_length = struct.unpack(">I", blob[8:12])[0]
    ciphertext = blob[12 + original_length :]
    forged = (
        sealed.MAGIC + struct.pack(">I", len(forged_header)) + forged_header + ciphertext
    )

    with pytest.raises(sealed.WrongPassphraseError):
        sealed.unseal(forged, PASSPHRASE)


def test_a_flipped_byte_of_ciphertext_is_refused():
    blob = bytearray(sealed.seal(PLAINTEXT, PASSPHRASE))
    blob[-1] ^= 0x01
    with pytest.raises(sealed.WrongPassphraseError):
        sealed.unseal(bytes(blob), PASSPHRASE)


def test_a_short_passphrase_is_refused_at_seal_time():
    with pytest.raises(sealed.WeakPassphraseError):
        sealed.seal(PLAINTEXT, "short")


def test_an_archive_written_with_other_parameters_still_opens():
    """The cost parameters travel in the file, so raising them later cannot
    orphan an archive written today. Simulated by lowering them."""
    blob = sealed.seal(PLAINTEXT, PASSPHRASE)
    header = sealed.read_header(blob)
    assert header["n"] == 2**15

    #  Re-seal under deliberately cheap parameters, the way a much older
    #  version of this format would have.
    original_n = sealed._SCRYPT_N
    try:
        sealed._SCRYPT_N = 2**10
        old = sealed.seal(PLAINTEXT, PASSPHRASE)
    finally:
        sealed._SCRYPT_N = original_n

    assert sealed.read_header(old)["n"] == 2**10
    assert sealed.unseal(old, PASSPHRASE) == PLAINTEXT


@pytest.mark.parametrize(
    "blob",
    [b"", b"{}", b"plain json, not sealed", b"BILLGENC", b"BILLGENC\x00\x00\x00\x05ab"],
)
def test_what_is_not_a_sealed_archive_is_recognised_as_such(blob):
    if sealed.is_sealed(blob):
        with pytest.raises(sealed.NotSealedError):
            sealed.read_header(blob)
    else:
        assert not sealed.is_sealed(blob)
