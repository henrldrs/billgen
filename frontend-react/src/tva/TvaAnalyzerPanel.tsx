/** The TVA position (§6) and the period view (§10, §11).
 *
 *  Scaffold — see README.md. Takes its position as a prop; nothing is fetched.
 *
 *  Three things this panel refuses to do:
 *
 *  1. **Show one "recoverable" number.** Confirmed and potential are separate
 *     KPIs, because they are separate facts. Adding them would make the
 *     headline move whenever an extractor changed its mind.
 *  2. **Fold the estimate into the payable.** `estimated_payable` uses only
 *     confirmed recovery, and the hint under it says so.
 *  3. **Offer Export while exceptions are open.** §11 asks for a deliberate
 *     checkpoint, so the primary CTA becomes "Review N exceptions" and the
 *     export button is not merely disabled — it is not the primary action.
 */

import { Banner, Button, Card, KpiCard, LoadingScreen, Table, type TableColumn } from "@henrioutai/ui";

import { formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import { PERIOD_MESSAGE, type PeriodState, type RecoveryTreatment } from "./states";
import type { TreatmentBreakdown, TvaPosition } from "./types";

export interface TvaAnalyzerPanelProps {
  position: TvaPosition;
  currency?: string;
  lang?: Lang;
  periodLabel: string;
  periodState?: PeriodState;
  onReviewExceptions: () => void;
  onExport: () => void;
}

const TREATMENT_LABEL: Record<RecoveryTreatment, string> = {
  recoverable: "Recoverable",
  partial: "Partially recoverable",
  non_recoverable: "Not recoverable",
  review_required: "Review required",
};

export function TvaAnalyzerPanel({
  position,
  currency = "EUR",
  lang = "en",
  periodLabel,
  periodState = "idle",
  onReviewExceptions,
  onExport,
}: TvaAnalyzerPanelProps) {
  // §12: the Loading component is for active background work, and this is the
  // only branch in the panel that shows it.
  if (periodState !== "idle") {
    return <LoadingScreen label={PERIOD_MESSAGE[periodState] ?? undefined} />;
  }

  const columns: TableColumn<TreatmentBreakdown>[] = [
    {
      key: "treatment",
      label: "Treatment",
      render: (row) => TREATMENT_LABEL[row.treatment],
    },
    { key: "count", label: "Expenses", numeric: true },
    {
      key: "detected",
      label: "TVA detected",
      numeric: true,
      render: (row) => formatMoney(row.detected, currency, lang),
    },
    {
      key: "recoverable",
      label: "Recoverable",
      numeric: true,
      render: (row) => formatMoney(row.recoverable, currency, lang),
    },
  ];

  const blocked = position.unresolved_exceptions > 0;

  return (
    <div className="bg-stack">
      <div className="bg-kpi-grid">
        <KpiCard
          label="TVA collected"
          value={formatMoney(position.collected, currency, lang)}
          hint="From your invoices"
        />
        <KpiCard
          label="Confirmed recoverable"
          value={formatMoney(position.confirmed_recoverable, currency, lang)}
          hint="Treatments you have accepted"
        />
        <KpiCard
          label="Potentially recoverable"
          value={formatMoney(position.potential_recoverable, currency, lang)}
          hint="BillGen's suggestion — not yet confirmed"
        />
        <KpiCard
          label="Estimated TVA payable"
          value={formatMoney(position.estimated_payable, currency, lang)}
          hint="Collected minus confirmed recovery only"
        />
      </div>

      {blocked && (
        <Banner tone="warn" title={`${position.unresolved_exceptions} expenses need review`}>
          BillGen will not add unconfirmed treatments to your position. Resolve these first.
        </Banner>
      )}

      <Card
        title={`TVA — ${periodLabel}`}
        subtitle={`${position.expenses_analyzed} expenses analyzed`}
        padded={false}
      >
        <Table columns={columns} rows={position.breakdown} rowKey={(row) => row.treatment} />
      </Card>

      <div className="bg-tva-actions">
        {blocked ? (
          <Button variant="primary" onClick={onReviewExceptions}>
            Review {position.unresolved_exceptions} exceptions
          </Button>
        ) : (
          <Button variant="primary" onClick={onExport}>
            Export report
          </Button>
        )}
      </div>
    </div>
  );
}
