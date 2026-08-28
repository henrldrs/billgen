/** The shapes the TVA panels consume.
 *
 *  Scaffold — see README.md. These are hand-written because no endpoint exists
 *  to generate them from; `src/types/api.d.ts` comes from the API's OpenAPI
 *  schema, and the moment `GET /tva/...` ships, these types should be deleted
 *  and replaced by the generated ones rather than kept in sync by hand.
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
