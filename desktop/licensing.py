"""Offline license verification for the desktop build.

A license is a JSON file with a payload and an Ed25519 signature over the
canonical (sorted, compact) payload bytes. The private key stays offline on the
license server; only the public key ships in the app. Symmetric schemes (HMAC)
are unsuitable — the embedded secret would be extractable from the binary.

Policy has two settings, and the packaged build uses the strict one:

* **Grace** (`require_license=False`) — a *present* license must verify, not be
  expired and, when it names a machine, name *this* one; an *absent* license is
  allowed. This is what a development checkout runs under.
* **Required** (`require_license=True`) — the packaged build. No license, or no
  public key to check it against, is a refusal to start. Fail closed: an app
  that starts when its own key is missing is not licensed software, it is
  software with a licensing-shaped comment in it.

The binding to a machine is `machine_fingerprint()` — on Windows the
`MachineGuid`, which survives reboots and hardware swaps and changes on an OS
reinstall. That is the binding Henri asked for (2026-09-09). Deliberately not
the MAC address, which docking stations and VPN adapters move, and not an IP.
A fingerprint is a *binding*, not a secret: it is signed into the payload, so
editing it invalidates the signature.

The reissue path — a dead laptop must not be a dead business — is
`docs/LICENSING.md`."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
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

#  The public key ships beside this module, so it is copied into the packaged
#  runtime with the rest of `desktop/` and needs no separate build step. It is
#  written by `scripts/license_tool.py keygen`; the private half never enters
#  the repo. Absent here, a packaged build refuses to start (see check_license).
PUBLIC_KEY_NAME = "license_key.pub"
PUBLIC_KEY_ENV = "BILLGEN_LICENSE_PUBLIC_KEY"
MACHINE_ID_ENV = "BILLGEN_MACHINE_ID"


class LicenseError(RuntimeError):
    """License missing where required, malformed, badly signed, or expired."""


@dataclass(frozen=True)
class LicenseInfo:
    email: str
    plan: str
    expires: date | None
    hardware_id: str | None
    payload: dict[str, Any]


def public_key_path() -> Path:
    """Where the shipped public key lives. `BILLGEN_LICENSE_PUBLIC_KEY` points
    elsewhere — used by the signing tool and by tests, never by a build."""
    override = os.environ.get(PUBLIC_KEY_ENV)
    if override:
        return Path(override)
    return Path(__file__).resolve().parent / PUBLIC_KEY_NAME


def public_key() -> bytes | None:
    """The shipped public key, or None when this build has none."""
    path = public_key_path()
    try:
        return path.read_bytes()
    except OSError:
        return None


def _windows_machine_guid() -> str | None:
    r"""`HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`, read 64-bit.

    `KEY_WOW64_64KEY` matters: the sidecar interpreter is 64-bit today, but a
    32-bit one would be silently redirected to the Wow6432Node view and read a
    *different* GUID — a license that verifies under one build and not the
    other, for a reason nothing in the error would name.
    """
    import winreg  # noqa: PLC0415 - Windows only, imported where it is used

    try:
        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
            0,
            winreg.KEY_READ | winreg.KEY_WOW64_64KEY,
        ) as key:
            value, _kind = winreg.QueryValueEx(key, "MachineGuid")
    except OSError:
        return None
    value = str(value).strip()
    return value or None


def _raw_machine_id() -> str | None:
    """The platform's own installation identifier, unhashed."""
    if sys.platform == "win32":
        return _windows_machine_guid()
    if sys.platform == "darwin":
        try:
            out = subprocess.run(  # noqa: S603 - fixed argv, no shell
                ["/usr/sbin/ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
                capture_output=True,
                text=True,
                check=False,
                timeout=10,
            ).stdout
        except (OSError, subprocess.SubprocessError):
            return None
        for line in out.splitlines():
            if "IOPlatformUUID" in line:
                return line.split('"')[-2]
        return None
    for candidate in (Path("/etc/machine-id"), Path("/var/lib/dbus/machine-id")):
        try:
            value = candidate.read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if value:
            return value
    return None


def machine_fingerprint() -> str | None:
    """A stable identifier for this OS install, or None where none is readable.

    Hashed rather than passed through: the raw GUID is a system identifier that
    ends up in a file Henri emails, and the license only ever needs to compare
    two of these. `BILLGEN_MACHINE_ID` overrides it — that is how the signing
    tool takes a fingerprint Emilia read out, and how the tests get a machine.
    """
    override = os.environ.get(MACHINE_ID_ENV)
    if override:
        return override.strip() or None
    raw = _raw_machine_id()
    if raw is None:
        return None
    digest = hashlib.sha256(f"billgen:{raw.lower()}".encode()).hexdigest()
    #  32 hex characters is 128 bits — far past collision territory, and short
    #  enough that a person can read it down a phone line without losing their
    #  place. Grouped in fives by `format_fingerprint` when it is shown.
    return digest[:32]


def format_fingerprint(fingerprint: str) -> str:
    """`abcde-fghij-...` — for reading aloud and for pasting into an email."""
    return "-".join(fingerprint[i : i + 5] for i in range(0, len(fingerprint), 5))


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


def verify_license(
    document: dict[str, Any],
    public_key_pem: bytes,
    *,
    machine_id: str | None = None,
) -> LicenseInfo:
    """Verify a `{payload, signature}` document against the public key.

    `machine_id` is the fingerprint to hold the license against. None means
    *do not check* — this function stays a pure verification of the document,
    and it is `check_license` that decides which machine is asking.
    """
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

    #  A payload with no hardware_id is deliberately portable — that is how a
    #  reissue for a laptop that no longer boots is written (docs/LICENSING.md).
    #  A payload that names a machine is checked against the one asking.
    licensed_machine = payload.get("hardware_id")
    if licensed_machine and machine_id is not None and licensed_machine != machine_id:
        raise LicenseError(
            "This license was issued for a different machine. "
            f"It names {format_fingerprint(str(licensed_machine))}; "
            f"this computer is {format_fingerprint(machine_id)}. "
            "A licence is reissued rather than moved, not copied across: "
            "see docs/LICENSING.md."
        )

    return LicenseInfo(
        email=payload.get("email", ""),
        plan=payload.get("plan", "personal"),
        expires=expires,
        hardware_id=payload.get("hardware_id"),
        payload=payload,
    )


def load_and_verify(
    path: Path, public_key_pem: bytes, *, machine_id: str | None = None
) -> LicenseInfo:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise LicenseError(f"Cannot read license file: {exc}") from exc
    return verify_license(document, public_key_pem, machine_id=machine_id)


def check_license(
    path: Path,
    public_key_pem: bytes | None,
    *,
    require_license: bool = False,
    machine_id: str | None = None,
) -> LicenseInfo | None:
    """Boot-time policy. Returns the verified LicenseInfo, or None when no
    license is present and one is not required. Raises LicenseError when a
    license is required but missing, when it is present but
    invalid/expired/issued to another machine, or when a build that requires
    one carries no key to check it with.

    `machine_id` is this machine's fingerprint unless one is passed. Boot-time
    policy always binds to the machine asking; a tool that wants to read
    someone else's license calls `verify_license` directly.
    """
    #  Before the file: a build that requires a license and has no public key
    #  cannot verify anything, and starting anyway would make the requirement
    #  decorative. Checked first so the message names the build's fault rather
    #  than blaming a license file that may be perfectly good.
    if require_license and public_key_pem is None:
        raise LicenseError(
            "This build requires a license but carries no public key. "
            "It was packaged without desktop/license_key.pub — refusing to start."
        )
    if not path.exists():
        if require_license:
            raise LicenseError(f"No license file found at {path}")
        return None
    if public_key_pem is None:
        raise LicenseError("License present but no public key configured")

    resolved = machine_id or machine_fingerprint()
    info = load_and_verify(path, public_key_pem, machine_id=resolved)
    #  A license bound to a machine, on a machine that cannot say which one it
    #  is, is unverifiable rather than valid. Refusing is the conservative half
    #  of the same decision as refusing when the public key is missing.
    if info.hardware_id and resolved is None:
        raise LicenseError(
            "This license is bound to a machine, and this computer's "
            "fingerprint could not be read — refusing to start."
        )
    return info


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
