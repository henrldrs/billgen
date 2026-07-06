"""Offline license verification for the desktop build.

A license is a JSON file with a payload and an Ed25519 signature over the
canonical (sorted, compact) payload bytes. The private key stays offline on the
license server; only the public key ships in the app. Symmetric schemes (HMAC)
are unsuitable — the embedded secret would be extractable from the binary.

Policy (Phase 9, beta): a *present* license must verify and not be expired; an
*absent* license is allowed (grace). Tighten `require_license` later."""

from __future__ import annotations

import json
from base64 import b64decode, b64encode
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
    load_pem_private_key,
    load_pem_public_key,
)


class LicenseError(RuntimeError):
    """License missing where required, malformed, badly signed, or expired."""


@dataclass(frozen=True)
class LicenseInfo:
    email: str
    plan: str
    expires: date | None
    hardware_id: str | None
    payload: dict[str, Any]


def _canonical(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_license(payload: dict[str, Any], private_key_pem: bytes) -> dict[str, Any]:
    """Produce a `{payload, signature}` dict. Used by the license server and by
    tests — never ships in the app."""
    key = load_pem_private_key(private_key_pem, password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise LicenseError("Private key is not Ed25519")
    signature = key.sign(_canonical(payload))
    return {"payload": payload, "signature": b64encode(signature).decode("ascii")}


def verify_license(document: dict[str, Any], public_key_pem: bytes) -> LicenseInfo:
    """Verify a `{payload, signature}` document against the public key."""
    try:
        payload = document["payload"]
        signature = b64decode(document["signature"])
    except (KeyError, TypeError, ValueError) as exc:
        raise LicenseError(f"Malformed license document: {exc}") from exc

    key = load_pem_public_key(public_key_pem)
    if not isinstance(key, Ed25519PublicKey):
        raise LicenseError("Public key is not Ed25519")
    try:
        key.verify(signature, _canonical(payload))
    except InvalidSignature as exc:
        raise LicenseError("License signature is invalid") from exc

    expires_raw = payload.get("expires")
    expires = date.fromisoformat(expires_raw) if expires_raw else None
    if expires is not None and expires < date.today():
        raise LicenseError(f"License expired on {expires.isoformat()}")

    return LicenseInfo(
        email=payload.get("email", ""),
        plan=payload.get("plan", "personal"),
        expires=expires,
        hardware_id=payload.get("hardware_id"),
        payload=payload,
    )


def load_and_verify(path: Path, public_key_pem: bytes) -> LicenseInfo:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise LicenseError(f"Cannot read license file: {exc}") from exc
    return verify_license(document, public_key_pem)


def check_license(
    path: Path,
    public_key_pem: bytes | None,
    *,
    require_license: bool = False,
) -> LicenseInfo | None:
    """Boot-time policy. Returns the verified LicenseInfo, or None when no
    license is present and one is not required. Raises LicenseError when a
    license is required but missing, or present but invalid/expired."""
    if not path.exists():
        if require_license:
            raise LicenseError("No license file found")
        return None
    if public_key_pem is None:
        raise LicenseError("License present but no public key configured")
    return load_and_verify(path, public_key_pem)


def generate_keypair() -> tuple[bytes, bytes]:
    """(private_pem, public_pem). For tests and one-time server key setup."""
    private = Ed25519PrivateKey.generate()
    private_pem = private.private_bytes(
        Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
    )
    public_pem = private.public_key().public_bytes(
        Encoding.PEM, PublicFormat.SubjectPublicKeyInfo
    )
    return private_pem, public_pem
