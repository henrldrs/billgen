r"""What is inside a portable backup, before it is sealed (T-28).

A zip with a fixed shape:

```
MANIFEST.json         what this is, and what it claims to hold
backup.json           exactly the ADR-0003 payload GET /backup/export returns
documents/<path>      the T-27 files, at their registered relative paths
```

`backup.json` is byte-for-byte the thing `POST /backup/restore` already
accepts, which is the point: the portable archive is a wrapper, not a second
format. A person who cannot run a restore can unzip this, take that one member
and hand it to the endpoint.

`documents/` is where the sealed archive earns its name. The plain export
carries the *register* — path, hash, size — and no bytes, because bytes make an
unencrypted file dangerous rather than merely sensitive. Here they travel, and
they travel with the hashes the register recorded at issue, so a restore can
say which copies came back intact rather than assuming it.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from io import BytesIO
from typing import Any
from zipfile import ZIP_DEFLATED, BadZipFile, ZipFile

MANIFEST_NAME = "MANIFEST.json"
PAYLOAD_NAME = "backup.json"
DOCUMENTS_PREFIX = "documents/"
CONTAINER_FORMAT = "billgen-portable-backup"
CONTAINER_VERSION = 1


class ContainerError(Exception):
    """The archive is not one of ours, or not readable as one."""


@dataclass
class PackedArchive:
    blob: bytes
    documents: int = 0
    #  Registered files that could not be packed: gone from the folder, or
    #  present with bytes that do not hash to what was recorded at issue. Named
    #  rather than silently omitted — an archive quietly missing a document is
    #  the failure this whole ticket exists to avoid.
    skipped: list[str] = field(default_factory=list)


@dataclass
class UnpackedArchive:
    payload: dict[str, Any]
    documents: dict[str, bytes] = field(default_factory=dict)


def pack(
    payload: dict[str, Any],
    documents: Iterable[tuple[str, bytes | None]],
    *,
    skipped: Iterable[str] = (),
) -> PackedArchive:
    """Build the zip. `documents` is (relative path, bytes) — None means the
    caller could not produce the bytes, and the path is recorded as skipped."""
    members: list[tuple[str, bytes]] = []
    missing = list(skipped)
    for path, body in documents:
        if body is None:
            missing.append(path)
            continue
        members.append((DOCUMENTS_PREFIX + path, body))

    manifest = {
        "format": CONTAINER_FORMAT,
        "version": CONTAINER_VERSION,
        "created_at": datetime.now(UTC).isoformat(),
        "payload": PAYLOAD_NAME,
        "schema_version": payload.get("schema_version"),
        "organization": payload.get("organization", {}).get("name"),
        "invoices": len(payload.get("invoices", [])),
        "documents": len(members),
        "documents_not_included": sorted(missing),
        "restore_with": "POST /backup/restore/file, or POST /backup/restore with backup.json",
    }

    buffer = BytesIO()
    with ZipFile(buffer, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr(MANIFEST_NAME, json.dumps(manifest, indent=2, ensure_ascii=False))
        archive.writestr(PAYLOAD_NAME, json.dumps(payload, indent=2, ensure_ascii=False))
        for name, body in members:
            archive.writestr(name, body)
    return PackedArchive(blob=buffer.getvalue(), documents=len(members), skipped=sorted(missing))


def unpack(blob: bytes) -> UnpackedArchive:
    """Read the zip back. Raises ContainerError on anything that is not one."""
    try:
        with ZipFile(BytesIO(blob)) as archive:
            try:
                raw = archive.read(PAYLOAD_NAME)
            except KeyError as exc:
                raise ContainerError(
                    f"Archive has no {PAYLOAD_NAME} — not a BillGen portable backup"
                ) from exc
            documents = {
                name[len(DOCUMENTS_PREFIX) :]: archive.read(name)
                for name in archive.namelist()
                if name.startswith(DOCUMENTS_PREFIX) and not name.endswith("/")
            }
    except BadZipFile as exc:
        raise ContainerError(f"Not a readable archive: {exc}") from exc

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ContainerError(f"{PAYLOAD_NAME} is not JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise ContainerError(f"{PAYLOAD_NAME} is not a backup object")
    return UnpackedArchive(payload=payload, documents=documents)
