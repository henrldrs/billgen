"""Agent 1's deterministic half — Belgian VAT and e-invoicing (spec §5).

Every finding this scanner raises is `RequirementType.LEGAL`, and the schema
refuses a legal finding with no source (`findings.py`). That refusal is the
point: §1 forbids hallucinated compliance and §17 says rules must carry a
jurisdiction, an effective date and an authoritative source rather than being
embedded as prose. The rules therefore live in `rules/*.json` and are loaded
here, so a regulatory change is a data edit with a `last_reviewed` date rather
than a prompt someone has to remember to update.

A rule whose `last_reviewed` has gone stale is reported as stale. §17: the
system must never silently treat an outdated rule as current.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

from ..findings import Finding, Location, RequirementType, Severity
from .base import Scanner, ScanResult

RULES_DIR = Path(__file__).resolve().parent.parent / "rules"

#  A rule reviewed longer ago than this is not trusted to be current. Belgian
#  e-invoicing obligations moved twice while this product was being written.
_STALE_AFTER_DAYS = 180


def load_rules() -> list[dict]:
    rules: list[dict] = []
    if not RULES_DIR.exists():
        return rules
    for path in sorted(RULES_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for rule in data.get("rules", []):
            rule["_source_file"] = f"rules/{path.name}"
            rules.append(rule)
    return rules


class LegalScanner(Scanner):
    name = "legal"
    phase = 2
    agent = "legal-vat"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        rules = load_rules()
        observed: dict = {"rules_loaded": len(rules)}

        if not rules:
            res.not_assessed.append(
                "Belgian VAT / e-invoicing: the rule registry is empty, so no "
                "legal requirement was checked (§17)."
            )
            return res

        today = date.today()
        stale = []
        for rule in rules:
            reviewed = rule.get("last_reviewed")
            if not reviewed:
                stale.append(rule["id"])
                continue
            try:
                age = (today - datetime.strptime(reviewed, "%Y-%m-%d").date()).days
            except ValueError:
                stale.append(rule["id"])
                continue
            if age > _STALE_AFTER_DAYS:
                stale.append(rule["id"])
        observed["stale_rules"] = stale

        if stale:
            res.findings.append(
                Finding(
                    id="LEGAL-STALE-001",
                    agent="legal-vat",
                    severity=Severity.MEDIUM,
                    category="rule_currency",
                    title=f"{len(stale)} rule(s) in the registry are past review",
                    location=Location("billgen-audit/billgen_audit/rules"),
                    evidence=(
                        f"Not reviewed within {_STALE_AFTER_DAYS} days: "
                        + ", ".join(stale)
                    ),
                    impact=(
                        "§17 requires that an outdated rule is never silently treated "
                        "as current. Conclusions drawn from these rules carry the age "
                        "of the rule, not of the audit."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Re-read each rule against its source and update last_reviewed.",
                    confidence=1.0,
                    verification_test="Re-run; stale_rules should be empty.",
                )
            )

        # -- check each rule's code signal --------------------------------
        #
        #  A matched pattern is NOT compliance, and this loop is written to make
        #  that impossible to report. A grep for "retention" matches a document
        #  listing retention as a missing feature just as happily as it matches
        #  an implementation; treating the hit as a pass turns the tool into the
        #  hallucinated-compliance machine §1 forbids.
        #
        #  So there are two outcomes and neither of them is "compliant":
        #    no signal  -> NOT_IMPLEMENTED, a low-confidence finding
        #    signal     -> NEEDS_CONFIRMATION, an INFORMATIONAL finding that
        #                  names the files for the legal agent to read
        confirmations: list[str] = []
        for rule in rules:
            signal = rule.get("code_signal")
            if not signal:
                continue
            hits = self.grep(signal, *tuple(rule.get("suffixes", (".py",))))
            is_stale = rule["id"] in stale
            observed[rule["id"]] = {
                "state": "NEEDS_CONFIRMATION" if hits else "NOT_IMPLEMENTED",
                "hits": len(hits),
                "files": sorted({f for f, _, _ in hits})[:8],
            }

            if hits:
                confirmations.append(rule["id"])
                res.findings.append(
                    Finding(
                        id=f"LEGAL-{rule['id']}-C",
                        agent="legal-vat",
                        severity=Severity.INFORMATIONAL,
                        category=rule.get("topic", "vat"),
                        title=(
                            f"{rule['title'].replace('No ', 'Confirm ').rstrip('.')}"
                            f" — needs legal confirmation"
                        ),
                        location=Location(sorted({f for f, _, _ in hits})[0] if hits else None),
                        evidence=(
                            f"Code matching this rule's signal exists in "
                            f"{len(hits)} place(s), e.g. "
                            + ", ".join(sorted({f for f, _, _ in hits})[:4])
                            + ". A pattern match shows the topic is addressed "
                            "somewhere; it does not show the rule is met. Only a "
                            "reading of the implementation against the source can "
                            "conclude that."
                        ),
                        impact=(
                            "Until confirmed, this requirement is unverified. It is "
                            "not a finding and it is not a pass."
                        ),
                        requirement_type=RequirementType.ASSUMPTION,
                        recommendation=(
                            f"Have the legal agent read these files against "
                            f"{rule['source_url']} and record the conclusion."
                        ),
                        confidence=0.2,
                        verification_test=rule.get("verification_test", ""),
                        references=[rule["source_url"], f"{rule['_source_file']} :: {rule['id']}"],
                    )
                )
                continue

            res.findings.append(
                Finding(
                    id=f"LEGAL-{rule['id']}",
                    agent="legal-vat",
                    severity=Severity[rule.get("severity", "MEDIUM")],
                    category=rule.get("topic", "vat"),
                    title=rule["title"],
                    location=Location(rule.get("expected_location")),
                    evidence=(
                        f"No implementation signal for this rule was found in the "
                        f"target (searched: {signal!r}). "
                        + ("The rule itself is past review, so this conclusion is "
                           "doubly provisional. " if is_stale else "")
                        + "Static absence is not proof of non-compliance."
                    ),
                    impact=rule["impact"],
                    requirement_type=(
                        RequirementType.LEGAL
                        if rule.get("classification") == "legal_requirement"
                        else RequirementType.RECOMMENDATION
                    ),
                    recommendation=rule["recommendation"],
                    #  A grep proving absence is weak evidence and the report must
                    #  say so. Halved again where the rule is stale.
                    confidence=0.3 if is_stale else 0.45,
                    verification_test=rule.get("verification_test", ""),
                    references=[rule["source_url"], f"{rule['_source_file']} :: {rule['id']}"],
                )
            )

        #  The domain must not score out of a set of greps. Everything the
        #  scanner could only confirm-by-pattern is declared unassessed, which
        #  makes the scorecard print n/a for Legal/VAT until a human or the
        #  legal agent has actually read the implementation.
        if confirmations:
            res.not_assessed.append(
                f"Belgian VAT / e-invoicing: {len(confirmations)} rule(s) "
                f"({', '.join(confirmations)}) have implementation code present but "
                f"unverified. A pattern match is not a legal conclusion (§1, §5), so "
                f"this domain is not scored. Run the legal-vat agent over "
                f"evidence/legal-rules.json to close them."
            )

        self.evidence.record("legal-rules", observed)
        res.observations["legal"] = observed
        return res


class EInvoicingScanner(Scanner):
    """§5.3 — generation and transmission are separate states.

    The specification is explicit that a valid UBL document and a successful
    Peppol delivery are different things. A product that reports "sent" on the
    strength of having produced XML is making a claim it cannot support, and the
    customer discovers it when the invoice never arrives.
    """

    name = "einvoicing"
    phase = 2
    agent = "legal-vat"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        observed: dict = {}

        module = self.exists("core/einvoicing", "core/ubl", "core/peppol")
        observed["module"] = module
        if not module:
            res.not_assessed.append(
                "Structured e-invoicing (§5.3): no UBL/Peppol module found, so "
                "neither generation nor transmission was assessed."
            )
            return res

        #  Generation is a function that returns a document, so look for the
        #  definition rather than for prose. The earlier pattern required
        #  "ubl" and a verb on one line and missed `def build_invoice_ubl(...)`
        #  entirely -- which meant the scanner concluded "no generation" about a
        #  module whose whole purpose is generation, and then skipped the
        #  transmission finding that depended on it.
        generation = self.grep(
            r"(?i)^\s*def\s+\w*(build|render|generate|to)\w*(ubl|xml|invoice|cii)",
            ".py", under=module,
        )
        validation = self.grep(
            r"(?i)^\s*def\s+\w*validat|schematron", ".py", under=module
        )
        #  Transmission means reaching the network. A module that only builds
        #  and validates XML has no HTTP client and no access-point address, and
        #  those are the things to look for -- the word "send" appears in every
        #  codebase that emails a PDF.
        transmission = self.grep(
            r"(?i)(httpx|requests\.|aiohttp|access[_ ]?point|\bas4\b|smp_lookup|"
            r"def\s+\w*(transmit|dispatch|deliver)\w*)",
            ".py", under=module,
        )
        retries = self.grep(r"(?i)\b(retry|retries|backoff|dead[_-]?letter|idempot)\b", ".py")

        observed.update(
            {
                "generation": bool(generation),
                "validation": bool(validation),
                "transmission": bool(transmission),
                "retry_handling": bool(retries),
            }
        )

        if generation and not transmission:
            res.findings.append(
                Finding(
                    id="EINV-001",
                    agent="legal-vat",
                    severity=Severity.HIGH,
                    category="e_invoicing_transmission",
                    title="Structured invoices are generated but no transmission path exists",
                    location=Location(module),
                    evidence=(
                        f"{module} builds structured documents and validates them, but "
                        f"no send/transmit/access-point code was found."
                    ),
                    impact=(
                        "§5.3 requires generation and delivery to be distinct states. "
                        "With no transmission, a customer who believes the product "
                        "files their e-invoices is mistaken, and the obligation is "
                        "unmet with no error to signal it."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "Model delivery as its own state with its own failures, and "
                        "never let a generated document display as sent."
                    ),
                    confidence=0.7,
                    verification_test=(
                        "Generate an e-invoice and assert its status is not 'sent' "
                        "until an access point acknowledges it."
                    ),
                )
            )

        if transmission and not retries:
            res.findings.append(
                Finding(
                    id="EINV-002",
                    agent="legal-vat",
                    severity=Severity.MEDIUM,
                    category="e_invoicing_transmission",
                    title="Transmission exists with no visible retry or idempotency handling",
                    location=Location(module),
                    evidence="No retry, backoff, dead-letter or idempotency markers found.",
                    impact=(
                        "§5.3 asks how transmission failures, retries and duplicates "
                        "are handled. A retried send with no idempotency key delivers "
                        "the same invoice twice."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "Add bounded retries with an idempotency key and a dead-letter "
                        "path."
                    ),
                    confidence=0.6,
                    verification_test="Fail the access point once; assert exactly one delivery.",
                )
            )

        self.evidence.record("einvoicing", observed)
        res.observations["einvoicing"] = observed
        return res
