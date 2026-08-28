/** The TVA state machine, mirrored from `core/tva/states.py`.
 *
 *  Scaffold — see README.md.
 *
 *  **This is a mirror, and a mirror can drift.** The server is the authority;
 *  what is here exists so the UI can decide whether to show the Loading
 *  component without a round trip. The honest fix at integration time is to
 *  have the API emit `state` *and* a boolean the UI reads directly — at which
 *  point `isWorking` below becomes a fallback rather than a duplicate rule.
 *  It is written as one exported predicate precisely so it is one line to
 *  delete when that happens.
 *
 *  The rule itself (§12): the Loading component means active background work.
 *  An empty list, a finished analysis, an error and a permission refusal each
 *  get their own state — a spinner over any of them is a lie about what the
 *  system is doing.
 */

export type ExpenseState =
  | "imported"
  | "processing"
  | "extracted"
  | "validating"
  | "classifying"
  | "analyzed"
  | "reviewed"
  | "reconciled"
  | "ready"
  | "failed";

export type PeriodState = "idle" | "recalculating" | "reconciling" | "exporting";

const WORKING: ReadonlySet<ExpenseState> = new Set<ExpenseState>([
  "processing",
  "validating",
  "classifying",
]);

export function isWorking(state: ExpenseState): boolean {
  return WORKING.has(state);
}

export function isPeriodWorking(state: PeriodState): boolean {
  return state !== "idle";
}

/** What the Loading component says while each state is on screen.
 *
 *  Written out per state rather than as one generic "Loading…". The blueprint
 *  asks for "Extracting invoice information…" and "Recalculating TVA
 *  position…" because a user who can read what is happening waits; a user
 *  looking at a bare spinner reloads.
 */
export const WORKING_MESSAGE: Record<ExpenseState, string | null> = {
  imported: null,
  processing: "Extracting invoice information…",
  extracted: null,
  validating: "Checking invoice…",
  classifying: "Classifying expense…",
  analyzed: null,
  reviewed: null,
  reconciled: null,
  ready: null,
  failed: null,
};

export const PERIOD_MESSAGE: Record<PeriodState, string | null> = {
  idle: null,
  recalculating: "Recalculating TVA position…",
  reconciling: "Reconciling the period…",
  exporting: "Preparing your report…",
};

export type RecoveryTreatment =
  | "recoverable"
  | "partial"
  | "non_recoverable"
  | "review_required";

export type Confidence = "high" | "medium" | "low";
export type CheckStatus = "passed" | "warning" | "failed";
