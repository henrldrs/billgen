# ADR-0003 — Organization backup & restore

Status: **accepted** (2026-07-12) · Owner: Henri · Track: foundation hardening,
punch-list item "backup/restore" (now TICKETS T-06, T-23)

## Context

BillGen stores legally-binding Belgian invoices. The April 2026 audit's
mom-track flagged data loss as the top private-use risk (C1/H1); the rebuild
solved the *fragility* root cause (localStorage → real DB) but a user-facing
backup/restore has been the biggest remaining data-safety gap — especially on
desktop, where the SQLite file in the user's data directory is the only copy of the
business's bookkeeping.

Two hard constraints shape the design:

1. **Gapless numbering is law.** Issued invoice numbers form a gapless,
   row-locked series per (organization, company, scope). Any restore mechanism
   that *merges* backup data into an organization that already has live data
   could mint duplicate numbers or create gaps — both are Belgian VAT
   violations.
2. **Two engines, one product.** Desktop runs SQLite, SaaS runs Postgres. A
   file-level copy of the SQLite DB cannot restore into Postgres and vice
   versa; users may migrate between the two.

## Decision

**A logical, organization-scoped JSON backup, restorable only into an empty
organization.**

- **Export** (`GET /backup/export`) serializes every org-scoped entity through
  the domain models: companies, clients, products, invoices (with lines),
  credit notes (with lines), payments, the full audit log, and the **sequence
  counters verbatim**. Envelope:
  `{format: "billgen-backup", schema_version: 1, created_at, organization,
  …entity lists…, sequences}`. Exporting writes one `export_backup` audit
  entry (exports are traceable, same as PDF/Peppol exports).
- **Restore** (`POST /backup/restore`) is **disaster recovery / machine
  migration, not sync**: it refuses (409) unless the current organization has
  **zero companies**. It re-validates every entry through the domain models
  (a tampered or truncated file fails as a 409, not a 500), overrides
  `organization_id` with the *current* org (a backup can be restored into a
  new account), writes everything in one transaction, restores the sequence
  counters verbatim, and appends one `restore` audit entry with the counts.
  The next issued invoice continues the gapless series exactly where the
  backup left off.
- **Restore mints fresh UUIDs through one consistent remap** (same input id →
  same output id everywhere, including the client id embedded in monthly
  bucket scopes and references inside audit before/after JSON). Cross-
  references hold, but restored rows can never collide with rows already in
  the target database — including the source organization itself still
  living on the same shared Postgres. References (invoice numbers, display
  refs) are strings and stay byte-identical.
- **Users and credentials are deliberately NOT in the backup.** Auth belongs
  to the account, not the business data — and a backup file must never carry
  password hashes or refresh tokens.
- **Sequence counters travel verbatim, never recomputed.** Deriving them from
  restored invoices would silently break the moment any numbered invoice was
  voided (the counter is ahead of max(sequence_global)). `restore_value()`
  also never *lowers* an existing counter, as a last-line guard.
- The audit log travels with the data (append-only history is part of the
  bookkeeping). Restored entries keep their original timestamps and actor ids;
  actor ids may not resolve to users in the target org — the activity view
  already tolerates that.

## Alternatives rejected

- **DB-file backup (SQLite copy / pg_dump).** Simple and complete, but not
  portable across engines, not org-scoped on shared Postgres, and useless for
  SaaS users. May still arrive later as a desktop *convenience* on top of
  this (e.g. `VACUUM INTO` on app exit) — it does not replace the logical
  backup.
- **Merge-capable restore.** Would need per-entity conflict resolution and a
  renumbering story; renumbering issued invoices is legally impossible.
  Explicitly out of scope; the empty-org precondition enforces it.
- **Reusing the legacy-import pipeline.** Import maps *foreign* shapes with
  fuzzy dedup and deliberately refuses invoices. Backup is the opposite:
  exact same shapes, exact ids, invoices included. Different tool.

## Consequences

- Because of the id remap, restored audit `actor_user_id`s no longer point at
  real user accounts — acceptable: users aren't part of the backup, so those
  ids were unresolvable after any cross-account restore anyway. Timestamps
  and actions are what the fiscal trail needs.
- `schema_version` gates forward compatibility: bump it when models change
  shape and write a migration shim per version if old backups must stay
  restorable. It is **3** today: 2 added `quotes`, 3 added `documents` — the
  register of files written outside the database (T-27). Older files restore
  unchanged; they simply carry none of the newer collections.
- The document register travels in the JSON; the documents do not. A restore
  reports the registered paths whose bytes are not in the archive
  (`RestoreReport.missing_documents`) and completes, because the invoice is in
  the rows and a missing PDF is a lost copy rather than a lost record.
- **The portable archive carries the bytes, and is encrypted** (T-28).
  `POST /backup/export/encrypted` zips this same JSON as `backup.json` together
  with `documents/<path>`, then seals the zip with AES-256-GCM under a
  scrypt-derived key (`core/backup/sealed.py`). The plaintext header names the
  KDF parameters, the salt and the nonce, and is bound as AAD so editing it
  breaks the tag rather than weakening the file. The plain export is unchanged
  and the archive wraps it, so `backup.json` unzipped by hand still restores
  through `POST /backup/restore`.
- **The passphrase is never stored and cannot be recovered.** No hint, no
  escrow, no reset — the property that makes the file safe to carry is the same
  one that makes a forgotten passphrase the end of that archive. The API
  refuses to produce one until the caller sets `acknowledge_unrecoverable`, and
  `GET /backup/passphrase-notice` is the single wording every screen uses.
- `POST /backup/restore/file` takes a file rather than a JSON body — sealed,
  zipped or plain — and reads the first eight bytes to decide whether it needs
  a passphrase. Decryption happens before anything touches the database, so a
  wrong passphrase can never leave a half-restored organization.
- The settings page of both shells gains a Backup section: download the JSON,
  restore from file behind a confirmation.
