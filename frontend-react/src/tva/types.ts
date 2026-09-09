/** The shapes the TVA panels consume.
 *
 *  Scaffold — see README.md. Hand-written, and no longer because the endpoints
 *  are missing: `/tva/position` and `/expenses` ship, and `src/types/api.d.ts`
 *  carries their schemas. They are not the same shapes, which is why this file
 *  survived T-24's sweep:
 *
 *    - `ExpenseSummary` is a view model — supplier, number, date and total are
 *      flat fields. `ExpenseResponse` nests them under `extracted` and adds the
 *      ids, timestamps and `needs_attention` the panels never read.
 *    - `TvaPosition` is `TvaPositionResponse` minus `period_start`,
 *      `period_end` and `is_complete`.
 *    - `ExpenseCheck` and `ImportProgress` have no generated counterpart at all.
 *
 *  So this is a mapping job, not a deletion: it belongs to the ticket that
 *  reshapes these panels with Henri, not to a hygiene pass.
 */

import type { CheckStatus, Confidence, ExpenseState, RecoveryTreatment } from "./states";

export interface ExpenseCheck {
  code: string;
  status: CheckStatus;
  context?: Record<string, string>;
}

export interface ExpenseClassification {
  treatment: RecoveryTreatment;
  confidence: Confidence;
  detected_amount: string;
  recoverable_amount: string;
  deductible_percent: string;
  reason_codes: string[];
  confirmed_at: string | null;
}

export interface ExpenseSummary {
  id: string;
  state: ExpenseState;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_ttc: string | null;
  currency: string;
  expense_category: string | null;
  classification: ExpenseClassification | null;
  checks: ExpenseCheck[];
  duplicate_of_id: string | null;
  source_document_url: string | null;
}

export interface TreatmentBreakdown {
  treatment: RecoveryTreatment;
  count: number;
  detected: string;
  recoverable: string;
}

export interface TvaPosition {
  expenses_analyzed: number;
  detected: string;
  /** Split on purpose — see `core/tva/analyzer.py`. There is no combined total. */
  confirmed_recoverable: string;
  potential_recoverable: string;
  review_required: string;
  non_recoverable: string;
  collected: string;
  estimated_payable: string;
  unresolved_exceptions: number;
  breakdown: TreatmentBreakdown[];
}

export interface ImportProgress {
  total: number;
  processed: number;
  failed: number;
}
