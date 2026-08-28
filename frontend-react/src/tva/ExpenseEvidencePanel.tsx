/** The evidence view (§7, §8) — document on the left, conclusion on the right.
 *
 *  Scaffold — see README.md.
 *
 *  The blueprint's fundamental principle, and the reason this panel is worth
 *  building before the analyzer is pretty: **every TVA conclusion should be
 *  traceable back to the document.** So the source is on screen next to the
 *  claim, the checks are listed individually rather than summarised as a
 *  score, and the confidence is stated instead of implied by confident
 *  styling.
 *
 *  Changing the treatment is a radio group, not a free amount field. A user
 *  typing "€52.50 recoverable" produces a number nothing on the document
 *  supports; picking "partially recoverable" produces one that is derived and
 *  can be re-derived when the amount changes.
 */

import { useState } from "react";
import { Badge, Button, Card, LoadingScreen, RadioGroup } from "@henrioutai/ui";

import { formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import { WORKING_MESSAGE, isWorking, type RecoveryTreatment } from "./states";
import type { ExpenseSummary } from "./types";

export interface ExpenseEvidencePanelProps {
  expense: ExpenseSummary;
  currency?: string;
  lang?: Lang;
  onAccept: () => void;
  onChangeTreatment: (treatment: RecoveryTreatment, deductiblePercent: string) => void;
}

const CHECK_LABEL: Record<string, string> = {
  supplier_missing: "Supplier identified",
  supplier_vat_present: "Supplier VAT number",
  supplier_vat_missing: "Supplier VAT number",
  invoice_number_missing: "Invoice number",
  invoice_date_missing: "Invoice date",
  arithmetic_consistent: "HT + TVA = TTC",
  arithmetic_inconsistent: "HT + TVA = TTC",
  arithmetic_incomplete: "HT + TVA = TTC",
  rate_standard: "TVA rate",
  rate_missing: "TVA rate",
  rate_non_standard: "TVA rate",
  rate_contradicts_amounts: "TVA rate",
};

export function ExpenseEvidencePanel({
  expense,
  currency = "EUR",
  lang = "en",
  onAccept,
  onChangeTreatment,
}: ExpenseEvidencePanelProps) {
  const classification = expense.classification;
  const [treatment, setTreatment] = useState<RecoveryTreatment>(
    classification?.treatment ?? "review_required",
  );

  if (isWorking(expense.state)) {
    return <LoadingScreen label={WORKING_MESSAGE[expense.state] ?? undefined} />;
  }

  const suggested =
    classification &&
    (Number(classification.detected_amount) * Number(classification.deductible_percent)) / 100;

  return (
    <div className="bg-tva-evidence">
      <div className="bg-tva-evidence__source">
        {expense.source_document_url ? (
          <object
            data={expense.source_document_url}
            type="application/pdf"
            aria-label="Source document"
          >
            <a href={expense.source_document_url}>Open the source document</a>
          </object>
        ) : (
          // B2 — blob storage is unbuilt, so there is nothing to show. Saying
          // so beats an empty frame that looks like a failed render.
          <p className="bg-tva-note">
            The source document is not stored yet — BillGen has no document storage configured.
          </p>
        )}
      </div>

      <aside className="bg-stack">
        <Card title="TVA analysis">
          {classification ? (
            <>
              <p className="bg-num">
                {formatMoney(classification.detected_amount, currency, lang)} TVA detected
              </p>
              <p className="bg-num">
                {formatMoney(
                  classification.confirmed_at ? classification.recoverable_amount : suggested ?? 0,
                  currency,
                  lang,
                )}{" "}
                {classification.confirmed_at ? "recoverable" : "potentially recoverable"}
              </p>
              <Badge tone="neutral">Confidence: {classification.confidence}</Badge>
            </>
          ) : (
            <p className="bg-tva-note">This expense has not been classified yet.</p>
          )}
        </Card>

        <Card title="Document check">
          <ul className="bg-tva-checks">
            {expense.checks.map((check) => (
              // The tick/warn/cross glyph is drawn by tva.css from
              // data-status. Keeping it out of the TSX is not only tidier —
              // the icon guard forbids emoji-range characters in source, and
              // U+2713 is inside that range.
              <li key={check.code} data-status={check.status}>
                <span aria-hidden="true" className="bg-tva-checks__mark" />
                <span>{CHECK_LABEL[check.code] ?? check.code}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recovery">
          <RadioGroup
            name="recovery-treatment"
            value={treatment}
            onChange={(value) => setTreatment(value as RecoveryTreatment)}
            options={[
              { value: "recoverable", label: "Fully recoverable" },
              { value: "partial", label: "Partially recoverable" },
              { value: "non_recoverable", label: "Not recoverable" },
            ]}
          />
          <div className="bg-tva-actions">
            <Button
              variant="secondary"
              onClick={() =>
                onChangeTreatment(treatment, classification?.deductible_percent ?? "100")
              }
            >
              Change treatment
            </Button>
            <Button
              variant="primary"
              disabled={!classification || classification.confirmed_at !== null}
              onClick={onAccept}
            >
              Accept
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  );
}
