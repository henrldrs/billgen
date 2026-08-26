/** The plan comparison, rendered from the server's own matrix.
 *
 *  `GET /plans` serves the entire commercial table — every tier, its quotas and
 *  its features — precisely so that this screen is not a second copy of
 *  `api/entitlements/matrix.py` maintained in TypeScript. Nothing about a tier
 *  is spelled out here: the columns are whatever the server sent, in the order
 *  it sent them (TIER_ORDER, cheapest first), and the rows are the union of the
 *  meters and feature keys it mentions. A price change, a new feature or a
 *  fifth tier needs no frontend release.
 *
 *  What the screen deliberately does NOT have is a "choose this plan" button.
 *  There is no checkout: subscriptions are a Merchant-of-Record adapter that
 *  has not been built. A button that cannot take money is worse than no button,
 *  so the panel says so in one line instead.
 */

import {
  Badge,
  Card,
  ErrorState,
  PageHeader,
  Skeleton,
  Table,
  type TableColumn,
} from "@henrioutai/ui";

import { useEntitlements, usePlans } from "../hooks/queries";
import { t, tFeature, tMeter, tTier, type Lang } from "../lib/translations";
import type { TierResponse } from "../types";
import { FeatureValue } from "./FeatureValue";

export interface PlansPanelProps {
  lang?: Lang;
}

/** One line of the comparison: a meter allowance or a feature, per tier. */
interface MatrixRow {
  key: string;
  label: string;
  kind: "quota" | "feature";
  /** tier name → the raw wire value for this row. */
  cells: Record<string, boolean | string | number | null | undefined>;
}

export function PlansPanel({ lang = "en" }: PlansPanelProps) {
  const plans = usePlans();
  // Which column to mark as the user's own. A failure here is not fatal: the
  // table is public information and still reads correctly unhighlighted.
  const entitlements = useEntitlements();
  const currentTier = entitlements.data?.tier;

  if (plans.isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => void plans.refetch()}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  if (plans.isLoading || !plans.data) {
    return (
      <div className="bg-stack">
        <Skeleton variant="block" height="4rem" />
        <Skeleton variant="block" height="20rem" />
      </div>
    );
  }

  const tiers = plans.data.tiers;
  const rows = buildRows(tiers, lang);

  const columns: TableColumn<MatrixRow>[] = [
    {
      key: "label",
      label: "",
      render: (row) => (
        <span className={`bg-plans__row bg-plans__row--${row.kind}`}>{row.label}</span>
      ),
    },
    ...tiers.map((tier) => ({
      key: tier.tier,
      label: (
        <span className="bg-plans__head">
          {tTier(lang, tier.tier)}
          {tier.tier === currentTier ? (
            <Badge tone="success">{t(lang, "plan.yourPlan")}</Badge>
          ) : null}
        </span>
      ),
      render: (row: MatrixRow) => <Cell row={row} tier={tier.tier} lang={lang} />,
    })),
  ];

  return (
    <div className="bg-stack">
      <PageHeader title={t(lang, "plan.allPlans")} subtitle={t(lang, "plan.noBilling")} />
      <Card padded={false}>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(row) => row.key}
          className="bg-plans__table"
        />
        <p className="bg-plans__caption">{t(lang, "plan.matrixCaption")}</p>
      </Card>
    </div>
  );
}

/** Quota rows first, then features — allowances are what people compare on,
 *  and a 24-row feature list above them buries the number that decides it.
 *
 *  Both row sets are the union across tiers rather than the first tier's keys:
 *  a capability introduced on Business Pro alone must still get a row, showing
 *  "not included" everywhere below it. */
function buildRows(tiers: TierResponse[], lang: Lang): MatrixRow[] {
  const meters: string[] = [];
  const features: string[] = [];
  for (const tier of tiers) {
    for (const quota of tier.quotas) {
      if (!meters.includes(quota.meter)) meters.push(quota.meter);
    }
    for (const key of Object.keys(tier.features)) {
      if (!features.includes(key)) features.push(key);
    }
  }

  const quotaRows: MatrixRow[] = meters.map((meter) => ({
    key: `quota:${meter}`,
    label: tMeter(lang, meter),
    kind: "quota",
    cells: Object.fromEntries(
      tiers.map((tier) => [
        tier.tier,
        tier.quotas.find((quota) => quota.meter === meter)?.limit,
      ]),
    ),
  }));

  const featureRows: MatrixRow[] = features.map((key) => ({
    key: `feature:${key}`,
    label: tFeature(lang, key),
    kind: "feature",
    cells: Object.fromEntries(tiers.map((tier) => [tier.tier, tier.features[key]])),
  }));

  return [...quotaRows, ...featureRows];
}

function Cell({ row, tier, lang }: { row: MatrixRow; tier: string; lang: Lang }) {
  const value = row.cells[tier];

  if (row.kind === "quota") {
    // null is unlimited; undefined is a meter this tier does not report at all,
    // which the matrix has no case for today but would otherwise render "0".
    if (value === null) return <span>{t(lang, "plan.unlimited")}</span>;
    if (value === undefined) return <span>—</span>;
    return <span className="bg-num">{String(value)}</span>;
  }

  return <FeatureValue value={value as boolean | string | undefined} lang={lang} />;
}
