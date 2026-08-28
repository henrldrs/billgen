/** The work queue (§6) — "don't make users hunt for problematic expenses".
 *
 *  Scaffold — see README.md.
 *
 *  Every row states *why* it is here. A flag without a reason is a flag the
 *  user resolves by guessing, and on a TVA return a guess is the failure mode
 *  the whole feature exists to avoid.
 *
 *  Reason codes come from the server (`core/tva`), and the sentence is built
 *  here. That split is the same one `GET /alerts` already uses: a server that
 *  ships prose ships it in one language, and BillGen has four.
 */

import { Badge, Button, EmptyState, List, type ListItemData } from "@henrioutai/ui";

import { formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import type { RecoveryTreatment } from "./states";
import type { ExpenseSummary } from "./types";

export interface TvaExceptionQueueProps {
  expenses: ExpenseSummary[];
  currency?: string;
  lang?: Lang;
  onOpen: (expenseId: string) => void;
}

/** One sentence per reason. Unknown codes fall through to the code itself —
 *  visible and ugly, which is the right failure: a silent "" would hide a
 *  server rule the UI never learned about. */
const REASON_TEXT: Record<string, string> = {
  tva_amount_not_detected: "BillGen could not find a TVA amount on this document.",
  supplier_vat_missing: "The supplier's VAT number is missing, so the TVA cannot be recovered.",
  category_unknown: "This expense has no category, and the treatment depends on one.",
  vehicle_business_use_unknown:
    "Vehicle costs are capped, and the limit depends on business use — which the document does not state.",
  gift_threshold_unknown: "Gifts are deductible only below a threshold BillGen cannot verify.",
  food_and_drink_excluded: "TVA on food and drink is not recoverable.",
  entertainment_excluded: "TVA on entertainment is not recoverable.",
  arithmetic_inconsistent: "HT + TVA does not equal TTC, so at least one figure was misread.",
  rate_contradicts_amounts: "The stated rate does not match the amounts on the document.",
  supplier_missing: "No supplier could be read from this document.",
  invoice_number_missing: "No invoice number could be read from this document.",
  invoice_date_missing: "No invoice date could be read from this document.",
};

function reasonSentence(codes: string[]): string {
  if (codes.length === 0) return "This expense needs a look.";
  return codes.map((code) => REASON_TEXT[code] ?? code).join(" ");
}

const TREATMENT_TONE: Record<RecoveryTreatment, "success" | "warn" | "neutral"> = {
  recoverable: "success",
  partial: "warn",
  non_recoverable: "neutral",
  review_required: "warn",
};

export function TvaExceptionQueue({
  expenses,
  currency = "EUR",
  lang = "en",
  onOpen,
}: TvaExceptionQueueProps) {
  if (expenses.length === 0) {
    // Not a Loading state and not an error — §12 is explicit that a finished
    // queue gets its own screen.
    return (
      <EmptyState
        title="Nothing needs your attention"
        description="Every analyzed expense has a treatment you have accepted."
      />
    );
  }

  const items: ListItemData[] = expenses.map((expense) => ({
    key: expense.id,
    primary: expense.supplier_name ?? "Unidentified supplier",
    secondary: (
      <>
        {expense.classification && (
          <span className="bg-num">
            {formatMoney(expense.classification.detected_amount, currency, lang)} TVA detected
          </span>
        )}
        <span>{reasonSentence(expense.classification?.reason_codes ?? [])}</span>
      </>
    ),
    trailing: expense.classification ? (
      <Badge tone={TREATMENT_TONE[expense.classification.treatment]}>
        {expense.classification.treatment.replace(/_/g, " ")}
      </Badge>
    ) : undefined,
    onClick: () => onOpen(expense.id),
  }));

  return (
    <div className="bg-stack">
      <h2>{expenses.length} expenses need review</h2>
      <List items={items} />
      <Button variant="secondary" onClick={() => onOpen(expenses[0].id)}>
        Review the largest first
      </Button>
    </div>
  );
}
