# Audit diff — audit-003 against audit-002

audit-003 vs audit-002: 0 new, 20 still open, 0 regressed, 0 resolved

## Regressed — resolved before, present again (0)

_none_

## New (0)

_none_

## Resolved (0)

_none_

## Still open (20)

- `ARCH-PUBLIC-001` Auth middleware exempts the whole '/auth/' prefix (MEDIUM)
- `ARCH-PUBWRITE-001` POST /auth/desktop-bootstrap is a write reachable without authentication (HIGH)
- `ARCH-PUBWRITE-002` POST /auth/logout is a write reachable without authentication (HIGH)
- `ARCH-PUBWRITE-003` POST /auth/signup is a write reachable without authentication (HIGH)
- `ARCH-AUTHZ-004` POST /invoices/preview declares no permission (HIGH)
- `LEGAL-BE-EINV-001-C` Confirm structured e-invoice generation is visible — needs legal confirmation (INFORMATIONAL)
- `LEGAL-BE-EINV-002-C` Confirm participant identifier handling is visible — needs legal confirmation (INFORMATIONAL)
- `LEGAL-BE-VAT-001-C` Mandatory invoice mentions are not visibly validated — needs legal confirmation (INFORMATIONAL)
- `LEGAL-BE-VAT-002-C` Confirm gapless sequential numbering mechanism is visible — needs legal confirmation (INFORMATIONAL)
- `LEGAL-BE-VAT-003-C` Credit notes do not visibly reference the corrected invoice — needs legal confirmation (INFORMATIONAL)
- `LEGAL-BE-VAT-004-C` Confirm VAT identification number validation is visible — needs legal confirmation (INFORMATIONAL)
- `LEGAL-BE-VAT-005-C` Confirm retention period is enforced or documented for issued documents — needs legal confirmation (INFORMATIONAL)
- `EINV-001` Structured invoices are generated but no transmission path exists (HIGH)
- `GDPR-001` 7 required privacy document(s) not present in the repository (HIGH)
- `GDPR-002` No endpoint implements data-subject export (HIGH)
- `GDPR-003` No endpoint implements data-subject deletion (HIGH)
- `RES-001` No recovery time or recovery point objective is documented (MEDIUM)
- `OBS-001` No request or correlation identifier is threaded through logs (MEDIUM)
- `ARCH-DOC-001` 7 endpoint(s) documented in system-architecture.html do not exist in the router tree (INFORMATIONAL)
- `SYS-DATA-LIFECYCLE` Data lifecycle — retention, erasure and recovery — 3 findings from 2 agents describe one mechanism (CRITICAL)
