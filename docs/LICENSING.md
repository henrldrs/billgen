# Licensing the desktop build

Emilia's copy of BillGen is a licensed desktop application. Nothing about that
is hosted: there is no license server, no activation call, and no network path
that can fail on a Monday morning. A license is **a signed file she has**, and
the app checks the signature offline with a public key it carries.

This document is the operational half — how a license is issued, what happens
when a laptop dies, and what must never leave this machine. The mechanism is in
[`desktop/licensing.py`](../desktop/licensing.py); the enforcement is in
[`desktop/bootstrap.py`](../desktop/bootstrap.py).

---

## The shape of it

| | |
|---|---|
| The file | `license.billgenlic` — JSON: a payload and an Ed25519 signature over it |
| Where it goes | the data directory, beside the database: `%USERPROFILE%\Documents\BillGen\` (`desktop/paths.py` resolves it; `BILLGEN_DATA_DIR` overrides) |
| What it says | email, plan, issue date, optional expiry, optional machine fingerprint |
| Who can make one | whoever holds the private key. That is Henri, and only Henri |
| Who can check one | anyone — the public key ships in the app, and checking needs nothing else |

**Ed25519 and not an HMAC.** A shared secret would have to ship inside the
binary, where anyone can extract it and mint their own licenses. A public key
can be extracted all day and forges nothing.

**The payload is signed, so every field is load-bearing.** Editing the plan to
`business`, or the machine to this one, or the expiry to next year, invalidates
the signature — there is no "some fields are checked" to get wrong.

---

## Issuing one

Three commands, in this order. All of them are
[`scripts/license_tool.py`](../scripts/license_tool.py).

### 1. The key pair — once, ever

```bash
python scripts/license_tool.py keygen --private-key ~/billgen-license-key.pem
```

It writes the private key where you told it — the tool **refuses a path inside
the repository** — and the public key to `desktop/license_key.pub`, which is
committed and ships in every build.

Back the private key up somewhere that is not this laptop. Losing it does not
invalidate the licenses already issued; it means no *new* ones can be issued
without a new key pair, and a new key pair means a new build in the hands of
everyone already running the old one. Treat it like the signing key it is.

### 2. Her machine's fingerprint

Run **on her machine**, not on yours:

```bash
python scripts/license_tool.py fingerprint
```

It prints something like `fb380-70da7-01e28-...`, grouped in fives so it can be
read down a phone line. That is a SHA-256 of the Windows `MachineGuid` —
`HKLM\SOFTWARE\Microsoft\Cryptography` — which survives reboots, hardware swaps
and disk changes, and changes on an OS reinstall. Deliberately not the MAC
address (docking stations and VPN adapters move it) and not an IP.

It is hashed rather than sent raw because the value ends up in a file that
travels by email, and comparing two fingerprints is all the app ever needs.

### 3. The license

```bash
python scripts/license_tool.py sign --email emilia@example.com --plan business --expires 2026-12-31 --machine fb380-70da7-01e28-09940-28036-6663b-13 --private-key ~/billgen-license-key.pem --out license.billgenlic
```

Send her the file; she drops it in `Documents\BillGen\`. `--expires` at the end
of the beta is the honest setting — a beta license that never expires is a
perpetual license nobody decided to grant.

To read one back, from either side:

```bash
python scripts/license_tool.py inspect license.billgenlic
```

---

## What the app does with it

At sidecar start, **before the migrations and before the port is bound** — an
unlicensed start should not touch her database.

| Situation | Development checkout | Packaged build |
|---|---|---|
| No license file | starts (grace) | **refuses**, exit 2 |
| Valid license, this machine | starts | starts |
| License for another machine | refuses | refuses |
| Expired | refuses | refuses |
| Signature does not verify | refuses | refuses |
| The build has no public key | starts (grace) | **refuses** |

That last row is the one worth arguing about, and it is deliberate: a build
that requires a license but carries no key to check one cannot verify anything,
and starting anyway would make the requirement decorative. It fails closed.

A refusal prints `BILLGEN_LICENSE error=...` on stderr and exits 2. The Tauri
shell otherwise reports only "sidecar did not report a port", which tells a
person nothing about what to do next.

Which policy applies is decided by `bootstrap.is_packaged()` — the interpreter
running from inside the runtime the installer carries. `BILLGEN_REQUIRE_LICENSE=1`
forces the strict policy on from a checkout, to rehearse it; `=0` forces it off,
which is how a rescue build starts. `scripts/check_sidecar_runtime.py` asserts
that a real packaged runtime answers `True` to both, so a build that quietly
lost its key fails the checker instead of shipping.

---

## When a laptop dies

**A dead laptop must not be a dead business.** The binding is a convenience for
Henri, never a hostage situation for the customer. Three cases:

**She has a new machine and the old one still boots.** Run `fingerprint` on the
new one, sign a new license, send it. The old file stops working the moment the
old machine is gone; nothing needs revoking, because nothing was ever activated.

**The old machine is gone — dead disk, stolen, reinstalled Windows.** Same
thing, minus the ceremony: `fingerprint` on the new machine, sign, send. There
is no activation count to reset and no server to call. Her *data* is a separate
question and lives in `Documents\BillGen\`, which is why it is there and not in
`%APPDATA%` (T-25); the backup is [T-23](TICKETS.md).

**She needs to work in the next ten minutes and you cannot get to a keyboard.**
Issue a **portable license** — omit `--machine`. It verifies on any machine, so
it is a real key to the product; give it a short `--expires` and replace it with
a bound one later. The refusal message points a stuck customer at this document.

**Under no circumstances** send her the private key, or a copy of the app with
the check removed. Both turn one awkward evening into a permanent hole.

---

## What must never happen

- The private key entering the repository. `.gitignore` refuses `*.pem` and
  `keygen` refuses a path inside the tree, but both are guard rails, not the
  rule.
- The private key entering a build. Nothing in `desktop/` reads it; only
  `scripts/license_tool.py` does, and that script does not ship.
- A license file committed. `*.billgenlic` is ignored — it is a customer's
  credential, not a fixture. The tests generate their own key pair per test.
- Rotating the key pair to fix something else. Every license in the field is
  checked against the shipped public key; a new pair orphans all of them.
