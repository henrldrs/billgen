r"""A backup that can leave the building (T-28).

`BackupService.export` produces readable JSON, which is what Henri wants for
everyday access and exactly what must not travel on a USB stick: it is every
client's name, address and VAT number in one file. A beta tester needs one
artifact she can move off the machine without becoming a breach.

**The format.** A plaintext header, then AES-256-GCM ciphertext:

```
BILLGENC          8 bytes, so the first thing a restore does is recognise it
<u32 big-endian>  header length
<header>          UTF-8 JSON: kdf, its parameters, the salt, the nonce
<ciphertext+tag>  AES-256-GCM over the zip, with the header as AAD
```

The header is deliberately readable. A person holding this file in three years
must be able to see what it is and what it would take to open it, without the
program that wrote it — and a restore must be able to say "this needs a
passphrase" before asking for one. The parameters travel *with* the file rather
than living in this module, so raising them later cannot orphan an archive
written today.

Binding the header as AAD is what stops the readable part from being the weak
part: an attacker who edits the salt, the cost parameters or the version to
something weaker changes the AAD, and the tag then fails. Tampering is a
decryption failure, not a downgrade.

**The passphrase is never stored and cannot be recovered.** There is no hint,
no escrow and no reset — that is the property that makes the file safe to
carry, and it is the same property that makes a forgotten passphrase the end of
that archive. Anything that could recover it could be used by whoever finds the
stick.
"""

from __future__ import annotations

import json
import os
import struct
from datetime import UTC, datetime
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC = b"BILLGENC"
SEALED_FORMAT = "billgen-sealed-backup"
VERSION = 1

_SALT_BYTES = 16
_NONCE_BYTES = 12
_KEY_BYTES = 32

#  ~32 MB and well under a second on a laptop. Written into every file, so a
#  future increase applies to new archives and leaves old ones openable.
_SCRYPT_N = 2**15
_SCRYPT_R = 8
_SCRYPT_P = 1

#  Not a policy about strong passwords — it is the floor below which the scrypt
#  cost stops mattering, because the whole keyspace is walkable. A person
#  choosing this is protecting a file holding every client they have.
MIN_PASSPHRASE_LENGTH = 12

#  One wording, in one place, for every screen and every error that has to say
#  it. T-29's settings panel shows it before the first export rather than after.
UNRECOVERABLE_NOTICE = (
    "This passphrase is never stored and cannot be recovered. "
    "Without it the archive cannot be opened by anyone, including us."
)


class SealedBackupError(Exception):
    """Base for everything this module refuses to do."""


class NotSealedError(SealedBackupError):
    """The bytes are not a sealed archive. Not an error on its own — a restore
    uses this to decide it is holding plain JSON instead."""


class WrongPassphraseError(SealedBackupError):
    """The passphrase did not open it, or the file has been altered.

    Deliberately one error for both. AES-GCM cannot tell them apart — a wrong
    key and a flipped byte both fail the tag — and a message that guessed would
    be a message that is sometimes wrong about whether a backup is intact.
    """


class WeakPassphraseError(SealedBackupError):
    """Below MIN_PASSPHRASE_LENGTH. Refused at seal time, never at open time:
    an archive already written with a short passphrase must still open."""


def is_sealed(blob: bytes) -> bool:
    return blob[: len(MAGIC)] == MAGIC


def read_header(blob: bytes) -> dict[str, Any]:
    """The plaintext header, without the passphrase. Raises NotSealedError.

    This is what lets a restore ask for a passphrase only when one is needed,
    and what a person can read with any zip-less JSON viewer three years from
    now.
    """
    if not is_sealed(blob):
        raise NotSealedError("Not a sealed BillGen backup")
    start = len(MAGIC)
    if len(blob) < start + 4:
        raise NotSealedError("Truncated sealed backup: no header length")
    (header_length,) = struct.unpack(">I", blob[start : start + 4])
    header_end = start + 4 + header_length
    if len(blob) < header_end:
        raise NotSealedError("Truncated sealed backup: header shorter than declared")
    try:
        header = json.loads(blob[start + 4 : header_end].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise NotSealedError(f"Unreadable sealed backup header: {exc}") from exc
    if not isinstance(header, dict):
        raise NotSealedError("Sealed backup header is not an object")
    return header


def seal(payload: bytes, passphrase: str, *, extra: dict[str, Any] | None = None) -> bytes:
    """Encrypt `payload` under `passphrase`. `extra` is merged into the readable
    header — counts and dates a person can see without opening the file."""
    if len(passphrase) < MIN_PASSPHRASE_LENGTH:
        raise WeakPassphraseError(
            f"A backup passphrase must be at least {MIN_PASSPHRASE_LENGTH} characters"
        )

    salt = os.urandom(_SALT_BYTES)
    nonce = os.urandom(_NONCE_BYTES)
    header: dict[str, Any] = {
        "format": SEALED_FORMAT,
        "version": VERSION,
        "created_at": datetime.now(UTC).isoformat(),
        "kdf": "scrypt",
        "n": _SCRYPT_N,
        "r": _SCRYPT_R,
        "p": _SCRYPT_P,
        "salt": salt.hex(),
        "cipher": "AES-256-GCM",
        "nonce": nonce.hex(),
        "content": "zip",
        "notice": UNRECOVERABLE_NOTICE,
    }
    header.update(extra or {})
    header_bytes = json.dumps(header, ensure_ascii=False).encode("utf-8")

    key = _derive(passphrase, salt, header)
    #  The header is the AAD, so editing the readable part — a smaller `n`, a
    #  different salt — breaks the tag instead of weakening the file.
    ciphertext = AESGCM(key).encrypt(nonce, payload, header_bytes)
    return MAGIC + struct.pack(">I", len(header_bytes)) + header_bytes + ciphertext


def unseal(blob: bytes, passphrase: str) -> bytes:
    """Decrypt a sealed archive. Raises WrongPassphraseError for both a wrong
    passphrase and an altered file — see that exception."""
    header = read_header(blob)
    header_length = struct.unpack(">I", blob[len(MAGIC) : len(MAGIC) + 4])[0]
    header_start = len(MAGIC) + 4
    header_bytes = blob[header_start : header_start + header_length]
    ciphertext = blob[header_start + header_length :]

    try:
        salt = bytes.fromhex(header["salt"])
        nonce = bytes.fromhex(header["nonce"])
    except (KeyError, ValueError) as exc:
        raise NotSealedError(f"Sealed backup header is missing {exc}") from exc

    key = _derive(passphrase, salt, header)
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, header_bytes)
    except InvalidTag as exc:
        raise WrongPassphraseError(
            "The passphrase did not open this archive, or the file has been altered. "
            "There is no way to recover it without the passphrase."
        ) from exc


def _derive(passphrase: str, salt: bytes, header: dict[str, Any]) -> bytes:
    """The key, using the cost parameters *in the file* rather than today's.

    An archive written last year opens with last year's parameters; raising
    them for new files is then a one-line change that orphans nothing.
    """
    if header.get("kdf") != "scrypt":
        raise NotSealedError(f"Unsupported key derivation: {header.get('kdf')!r}")
    try:
        kdf = Scrypt(
            salt=salt,
            length=_KEY_BYTES,
            n=int(header["n"]),
            r=int(header["r"]),
            p=int(header["p"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise NotSealedError(f"Sealed backup header has bad scrypt parameters: {exc}") from exc
    return kdf.derive(passphrase.encode("utf-8"))
