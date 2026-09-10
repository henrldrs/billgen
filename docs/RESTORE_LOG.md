# Restore log

**An untested restore is a belief.** This file is where a restore stops being
one: every entry says when it happened, on whose machine, from which file, and
what was compared afterwards. No entry means it has not been done, whatever the
code says.

T-23 is not closed until there is an entry from **Emilia's laptop**. The
rehearsal below is not that entry, and is written in full so nobody mistakes it
for one.

## The format

Copy this block, fill it in, keep the newest at the top.

```
### YYYY-MM-DD · <whose machine>
    file        the archive, by name, and where it came from
    into        the database it was restored into
    compared    what was checked, value by value
    result      what actually happened, including anything that did not match
    by          who ran it
```

Comparing "it opened and looked fine" is not comparing. The list worth
checking, in this order, because each one fails differently:

1. **The last invoice's reference and total.** The document a person would
   look for first.
2. **The invoice count**, against what the manifest claimed.
3. **The next number issued after the restore.** ADR-0003 restores sequence
   counters verbatim; if this reissues a number that is already on a document,
   the restore is worse than useless — it is a VAT violation.
4. **The document register** (`GET /documents`) against the `invoices/` folder.
   Since T-27 a restore *reports* the files it cannot find rather than failing,
   so a non-empty `missing_documents` is expected when only the JSON travelled.
   What matters is that the list matches what actually did not travel.

---

## Entries

### 2026-09-11 · this workstation — **a rehearsal, not the required note**
    file        a zip written by `desktop/backups.py` into a temp directory,
                the way the sidecar writes one at boot
    into        a fresh, empty organization in the same database, through
                `POST /backup/restore`
    compared    invoice reference; invoice total (as a number — money
                round-trips at the column's scale-6, so "1512.50" comes back
                "1512.500000"); the invoice count against the manifest; and the
                next issued invoice, which took the following number rather
                than reusing the restored one
    result      all four matched. Held as
                `tests/api/test_desktop_backup_rehearsal.py`, so it is checked
                on every run rather than remembered
    by          the solo run

    **Why this does not close T-23.** The database was made by the test, it
    never left the process, and nothing was ever actually lost. It proves the
    mechanism and says nothing about the failure it exists for: a machine whose
    data is gone, a file that travelled, and a person who needs their invoices
    back today.
