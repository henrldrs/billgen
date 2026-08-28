"""Agent 2's deterministic half — accounting invariants (spec §6).

§6.2 lists invariants an accounting system must hold. Most of them are runtime
properties and belong in the target's own test suite; what a static scanner can
honestly do is check that *something enforces them*, and say so where nothing
visibly does.

The distinction this file keeps: it never claims an invariant is violated. It
claims no enforcement was found. Those are different sentences and only the
second one is defensible from a file listing.
"""

from __future__ import annotations

from ..findings import Finding, Location, RequirementType, Severity
from .base import Scanner, ScanResult


class AccountingScanner(Scanner):
    name = "accounting"
    phase = 2
    agent = "accounting"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        seq = 0
        observed: dict = {}

        # -- §6.1 sequential numbering, protected against reuse ----------
        unique_numbering = self.grep(
            r"UniqueConstraint|unique=True", ".py", under="db"
        )
        sequence_table = self.exists("db/models/sequence.py")
        observed["numbering"] = {
            "sequence_model": sequence_table,
            "unique_constraints": len(unique_numbering),
        }
        if not unique_numbering:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"ACCT-{seq:03d}",
                    agent="accounting",
                    severity=Severity.HIGH,
                    category="document_numbering",
                    title="No database-level uniqueness protects invoice numbering",
                    location=Location("db"),
                    evidence=(
                        "No UniqueConstraint or unique=True was found in the "
                        "persistence layer. Uniqueness enforced only in application "
                        "code fails under concurrent issue (§6.1)."
                    ),
                    impact=(
                        "Two invoices can take the same number under concurrency, "
                        "which is an accounting defect that cannot be corrected "
                        "silently after the fact."
                    ),
                    requirement_type=RequirementType.ACCOUNTING,
                    recommendation=(
                        "Constrain the number at the database, and allocate it in "
                        "the same transaction that issues the document."
                    ),
                    confidence=0.8,
                    verification_test=(
                        "Issue N invoices concurrently; assert N distinct numbers "
                        "and no gaps beyond the documented policy."
                    ),
                )
            )

        # -- §6.1 immutability of issued documents -----------------------
        immutability = self.grep(
            r"(?i)immutab|frozen=True|cannot be (edited|modified|changed)|already issued",
            ".py",
            under="core",
        )
        observed["immutability_signals"] = len(immutability)
        if not immutability:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"ACCT-{seq:03d}",
                    agent="accounting",
                    severity=Severity.HIGH,
                    category="document_integrity",
                    title="No visible guard makes an issued document immutable",
                    location=Location("core"),
                    evidence=(
                        "No refusal to modify an issued or finalized document was "
                        "found in the domain layer."
                    ),
                    impact=(
                        "If a finalized invoice can be edited, the correction "
                        "mechanism is bypassed and the audit trail no longer "
                        "reconstructs what the customer received (§5.2, §6.1)."
                    ),
                    requirement_type=RequirementType.ACCOUNTING,
                    recommendation=(
                        "Refuse accounting-relevant mutation after issue; corrections "
                        "become credit notes."
                    ),
                    confidence=0.6,
                    verification_test=(
                        "Issue an invoice, then attempt to change a line amount; "
                        "expect refusal."
                    ),
                )
            )

        # -- §6.1 totals computed server-side ----------------------------
        client_totals = self.grep(
            r"\btotal\b\s*[:=].*\b(request|payload|body)\b", ".py", under="api"
        )
        observed["client_supplied_totals"] = [f"{f}:{n}" for f, n, _ in client_totals]
        for path, line, text in client_totals[:5]:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"ACCT-{seq:03d}",
                    agent="accounting",
                    severity=Severity.HIGH,
                    category="financial_correctness",
                    title="A total appears to be taken from the request rather than computed",
                    location=Location(path, line),
                    evidence=f"{text[:160]}",
                    impact=(
                        "§6.1 requires totals to be derived from line data. A total "
                        "the client can set is a total the client can falsify."
                    ),
                    requirement_type=RequirementType.ACCOUNTING,
                    recommendation=(
                        "Compute totals in the domain layer and ignore any supplied "
                        "value."
                    ),
                    confidence=0.4,
                    verification_test=(
                        "Post a document whose stated total contradicts its lines; "
                        "expect the server's figure to win."
                    ),
                )
            )

        # -- §6.1 audit trail --------------------------------------------
        audit_model = self.exists("db/models/audit_log.py", "db/models/audit_event.py")
        observed["audit_trail_model"] = audit_model
        if not audit_model:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"ACCT-{seq:03d}",
                    agent="accounting",
                    severity=Severity.HIGH,
                    category="auditability",
                    title="No audit-event model records who performed accounting actions",
                    location=Location("db/models"),
                    evidence="No audit log or audit event table was found.",
                    impact=(
                        "§6.1 and §9's correlated example both turn on this: without "
                        "it, a change to an accounting-relevant field has no author "
                        "and no timestamp."
                    ),
                    requirement_type=RequirementType.ACCOUNTING,
                    recommendation=(
                        "Record actor, action, target and time for every accounting "
                        "mutation."
                    ),
                    confidence=0.85,
                    verification_test=(
                        "Issue and void an invoice; assert two audit rows naming "
                        "the actor."
                    ),
                )
            )

        # -- §6.1 export for accountants ---------------------------------
        export = self.grep(r"(?i)\bexport\b", ".py", under="api/routers")
        observed["export_endpoints"] = len(export)
        if not export:
            res.not_assessed.append(
                "Accountant export (§6.1): no export endpoint was found, so the "
                "format and completeness of accounting export are unassessed."
            )

        self.evidence.record("accounting", observed)
        res.observations["accounting"] = observed
        return res


class DocumentEngineScanner(Scanner):
    """§10 — one document engine, and one source of truth behind every rendering.

    The specification's central architectural claim about documents: PDF and the
    structured e-invoice must both be renderings of the same domain model. If
    the UBL builder reads from the PDF's context, or each renderer assembles its
    own totals, the two representations of one invoice can disagree — and only
    one of them is the one the customer sees.
    """

    name = "documents"
    phase = 2
    agent = "accounting"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        observed: dict = {}

        pdf = self.exists("core/pdf")
        ubl = self.exists("core/einvoicing", "core/ubl")
        observed["pdf_module"] = pdf
        observed["einvoicing_module"] = ubl

        if not pdf or not ubl:
            res.not_assessed.append(
                "Document engine (§10): PDF and structured e-invoice modules were "
                "not both found, so the shared-source-of-truth question is "
                "unassessed."
            )
            self.evidence.record("documents", observed)
            res.observations["documents"] = observed
            return res

        #  Both renderers should import the domain invoice. A renderer that
        #  imports the API schema or the DB row instead has taken a different
        #  source of truth, which is the failure §10 warns about.
        pdf_domain = self.grep(r"from core\.models|from \.\.models", ".py", under=pdf)
        ubl_domain = self.grep(r"from core\.models|from \.\.models", ".py", under=ubl)
        observed["pdf_reads_domain"] = bool(pdf_domain)
        observed["einvoicing_reads_domain"] = bool(ubl_domain)

        if not (pdf_domain and ubl_domain):
            side = "PDF" if not pdf_domain else "structured e-invoice"
            res.findings.append(
                Finding(
                    id="DOC-001",
                    agent="accounting",
                    severity=Severity.MEDIUM,
                    category="document_engine",
                    title=f"The {side} renderer does not visibly read the domain model",
                    location=Location(pdf if not pdf_domain else ubl),
                    evidence=(
                        f"No import of the domain invoice model was found in "
                        f"{pdf if not pdf_domain else ubl}."
                    ),
                    impact=(
                        "§10 requires PDF and structured output to be renderings of "
                        "one authoritative model. Two independent assemblies of the "
                        "same invoice can disagree on totals, and the disagreement "
                        "is only discovered by the recipient."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "Render both from the same domain object, and test that the "
                        "PDF total equals the UBL payable amount for the same invoice."
                    ),
                    confidence=0.5,
                    verification_test=(
                        "Generate both representations of one invoice and assert the "
                        "totals match exactly."
                    ),
                )
            )

        templates = self.grep(r"(?i)template", ".py", under=pdf)
        observed["template_references"] = len(templates)

        self.evidence.record("documents", observed)
        res.observations["documents"] = observed
        return res
