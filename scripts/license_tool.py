r"""Issue and inspect BillGen desktop licenses. Henri's tool, not the app's.

Four commands, and the order they are used in:

    python scripts/license_tool.py keygen --private-key ..\billgen-license-key.pem

Once, ever. Writes the private key OUTSIDE the repository and the public key to
`desktop/license_key.pub`, which ships in every build. Losing the private key
means every future license needs a new public key and therefore a new build, so
back it up somewhere that is not this laptop.

    python scripts/license_tool.py fingerprint

Run ON the customer's machine. Prints the fingerprint to read down a phone line
or paste into an email.

    python scripts/license_tool.py sign --email emilia@example.com --plan business
        --expires 2026-12-31 --machine abcde-fghij-...
        --private-key ..\billgen-license-key.pem --out license.billgenlic

Produces the file the customer drops into their data directory.

    python scripts/license_tool.py inspect license.billgenlic

What a file actually says, verified against the shipped public key, without
pretending to be the machine it was issued for.

The private key never enters the repository, never enters a build, and is never
needed to *check* a license — that is the whole point of signing rather than
sharing a secret. `.gitignore` refuses `*.pem` to make the accident hard.

The reissue path, and what to do when a laptop dies, is docs/LICENSING.md.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))

from desktop import licensing, paths  # noqa: E402 - after sys.path is set


def cmd_keygen(args: argparse.Namespace) -> int:
    private_path = Path(args.private_key).expanduser().resolve()
    public_path = (
        Path(args.public_key) if args.public_key else licensing.public_key_path()
    )

    if private_path.is_relative_to(REPO):
        print(f"refusing: {private_path} is inside the repository", file=sys.stderr)
        print("the private key belongs where a commit cannot reach it", file=sys.stderr)
        return 2
    if private_path.exists() and not args.force:
        print(f"refusing: {private_path} already exists", file=sys.stderr)
        print("overwriting it invalidates every license ever issued", file=sys.stderr)
        return 2
    if public_path.exists() and not args.force:
        print(f"refusing: {public_path} already exists", file=sys.stderr)
        return 2

    private_pem, public_pem = licensing.generate_keypair()
    private_path.parent.mkdir(parents=True, exist_ok=True)
    private_path.write_bytes(private_pem)
    public_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.write_bytes(public_pem)

    print(f"private key  {private_path}   <- back this up, never commit it")
    print(f"public key   {public_path}   <- commit this; it ships in the build")
    return 0


def cmd_fingerprint(_args: argparse.Namespace) -> int:
    fingerprint = licensing.machine_fingerprint()
    if fingerprint is None:
        print("this machine has no readable installation id", file=sys.stderr)
        return 1
    print(licensing.format_fingerprint(fingerprint))
    return 0


def cmd_sign(args: argparse.Namespace) -> int:
    private_path = Path(args.private_key).expanduser()
    try:
        private_pem = private_path.read_bytes()
    except OSError as exc:
        print(f"cannot read the private key: {exc}", file=sys.stderr)
        return 2

    payload: dict[str, object] = {
        "email": args.email,
        "plan": args.plan,
        "issued": date.today().isoformat(),
        "expires": args.expires,
    }
    if args.machine:
        #  Accept the grouped form a person reads aloud, store the plain one.
        payload["hardware_id"] = args.machine.replace("-", "").strip().lower()

    try:
        document = licensing.sign_license(payload, private_pem)
    except licensing.LicenseError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    out = Path(args.out)
    out.write_text(json.dumps(document, indent=2), encoding="utf-8")
    print(f"wrote {out}")
    print(f"  email    {args.email}")
    print(f"  plan     {args.plan}")
    print(f"  expires  {args.expires or 'never'}")
    print(f"  machine  {args.machine or 'any (portable - see docs/LICENSING.md)'}")
    print(f"\nit goes at {paths.license_path()} on the customer's machine")
    return 0


def cmd_inspect(args: argparse.Namespace) -> int:
    public_pem = licensing.public_key()
    if public_pem is None:
        print(f"no public key at {licensing.public_key_path()}", file=sys.stderr)
        print("run: python scripts/license_tool.py keygen ...", file=sys.stderr)
        return 2
    try:
        document = json.loads(Path(args.path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"cannot read the license: {exc}", file=sys.stderr)
        return 2
    try:
        #  No machine_id: this tool reads licenses issued for other machines,
        #  and reporting which one it names is more useful than refusing to look.
        info = licensing.verify_license(document, public_pem)
    except licensing.LicenseError as exc:
        print(f"INVALID  {exc}", file=sys.stderr)
        return 1

    here = licensing.machine_fingerprint()
    print("VALID signature")
    print(f"  email    {info.email}")
    print(f"  plan     {info.plan}")
    print(f"  expires  {info.expires.isoformat() if info.expires else 'never'}")
    if info.hardware_id:
        matches = "this machine" if info.hardware_id == here else "ANOTHER machine"
        shown = licensing.format_fingerprint(info.hardware_id)
        print(f"  machine  {shown}  ({matches})")
    else:
        print("  machine  any - portable license")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="issue and inspect BillGen licenses")
    sub = parser.add_subparsers(dest="command", required=True)

    keygen = sub.add_parser("keygen", help="create the signing key pair (once)")
    keygen.add_argument("--private-key", required=True, help="path OUTSIDE the repo")
    keygen.add_argument("--public-key", help=f"default: desktop/{licensing.PUBLIC_KEY_NAME}")
    keygen.add_argument("--force", action="store_true", help="overwrite existing keys")
    keygen.set_defaults(func=cmd_keygen)

    fingerprint = sub.add_parser("fingerprint", help="this machine's id")
    fingerprint.set_defaults(func=cmd_fingerprint)

    sign = sub.add_parser("sign", help="issue a license file")
    sign.add_argument("--email", required=True)
    sign.add_argument("--plan", default="business")
    sign.add_argument("--expires", help="YYYY-MM-DD; omit for no expiry")
    sign.add_argument("--machine", help="fingerprint; omit for a portable license")
    sign.add_argument("--private-key", required=True)
    sign.add_argument("--out", default="license.billgenlic")
    sign.set_defaults(func=cmd_sign)

    inspect = sub.add_parser("inspect", help="read a license file")
    inspect.add_argument("path")
    inspect.set_defaults(func=cmd_inspect)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "sign" and args.expires:
        try:
            date.fromisoformat(args.expires)
        except ValueError:
            print("--expires must be YYYY-MM-DD", file=sys.stderr)
            return 2
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
