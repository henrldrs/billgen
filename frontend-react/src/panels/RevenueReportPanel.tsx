/** Revenue report — the only report the server can fully answer today.
 *
 *  Two endpoints, and the split between them is why this screen is honest:
 *
 *    GET /reports/revenue?year   twelve server-computed monthly totals
 *    GET /reports/kpi            invoiced / paid / outstanding, all time
 *
 *  The KPI strip is deliberately labelled "all time" rather than being folded
 *  into the selected year. Summing the twelve months into a year total would
 *  be trivial and would also be accounting arithmetic performed in a React
 *  component — the one thing hooks/queries.ts exists to keep out of the
 *  frontend. Every figure printed here is a figure the server sent.
 *
 *  The chart is hand-drawn SVG rather than a chart library: one <svg> in a
 *  ChartWrapper needs no dependency, inherits the token palette through
 *  currentColor and var(), and re-skins with the rest of the product.
 */

import { useMemo, useState } from "react";

import {
  Badge,
  Card,
  ChartWrapper,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  Select,
  Skeleton,
  Table,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";

import { useCompanies, useKpi, useRevenue } from "../hooks/queries";
import { formatMoney, monthName } from "../lib/format";
import { t, type Lang } from "../lib/translations";

export interface RevenueReportPanelProps {
  companyId: string;
  lang?: Lang;
  /** Seed year. Defaults to the current one; the Select drives it after that. */
  year?: number;
  /** How many years back the picker offers. */
  yearsBack?: number;
}

interface MonthRow {
  month: number;
  total: string;
}

/** One month of server-reported revenue, as the chart needs it. */
function toRows(months: Record<string, string | number> | undefined): MonthRow[] {
  return Object.entries(months ?? {})
    .map(([month, total]) => ({ month: Number(month), total: String(total) }))
    .sort((a, b) => a.month - b.month);
}

export function RevenueReportPanel({
  companyId,
  lang = "en",
  year: seedYear,
  yearsBack = 4,
}: RevenueReportPanelProps) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(seedYear ?? thisYear);
  const [sort, setSort] = useState<TableSort>({ key: "month", direction: "asc" });

  const revenue = useRevenue(companyId, year);
  const kpi = useKpi(companyId);
  const { data: companies } = useCompanies();

  // Currency belongs to the company, not to this screen — /reports/revenue
  // returns bare decimals, so hardcoding EUR here would silently mislabel a
  // company invoicing in anything else.
  const currency =
    companies?.find((company) => company.id === companyId)?.default_currency ?? "EUR";

  const rows = useMemo(() => toRows(revenue.data?.months), [revenue.data]);

  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) =>
      sort.key === "total"
        ? (Number(a.total) - Number(b.total)) * direction
        : (a.month - b.month) * direction,
    );
  }, [rows, sort]);

  // Selection, not arithmetic: the peak is one of the server's own figures
  // picked out of the twelve, never a number this component computed.
  const peak = rows.reduce<MonthRow | null>(
    (best, row) => (best === null || Number(row.total) > Number(best.total) ? row : best),
    null,
  );

  const years = Array.from({ length: yearsBack + 1 }, (_, index) => thisYear - index);

  const columns: TableColumn<MonthRow>[] = [
    {
      key: "month",
      label: t(lang, "dashboard.month"),
      sortable: true,
      render: (row) => monthName(row.month, lang),
    },
    {
      key: "total",
      label: t(lang, "dashboard.invoiced"),
      numeric: true,
      sortable: true,
      render: (row) => formatMoney(row.total, currency, lang),
    },
  ];

  const yearPicker = (
    <Field label={t(lang, "reports.year")}>
      <Select
        value={String(year)}
        options={years.map((value) => ({ value: String(value), label: String(value) }))}
        onChange={(event) => setYear(Number(event.target.value))}
      />
    </Field>
  );

  if (revenue.isError || kpi.isError) {
    return (
      <>
        <div className="bg-report__controls">{yearPicker}</div>
        <Card>
          <ErrorState
            title={t(lang, "common.error")}
            onRetry={() => {
              void revenue.refetch();
              void kpi.refetch();
            }}
            retryLabel={t(lang, "common.retry")}
          />
        </Card>
      </>
    );
  }

  const loading = revenue.isLoading || kpi.isLoading;

  return (
    <div className="bg-stack">
      <div className="bg-report__controls">{yearPicker}</div>

      {loading ? (
        <div className="bg-kpi-grid">
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
        </div>
      ) : (
        <div className="bg-kpi-grid">
          <KpiCard
            label={t(lang, "dashboard.invoiced")}
            value={formatMoney(kpi.data?.invoiced_total ?? 0, currency, lang)}
            hint={t(lang, "reports.revenueCaption")}
          />
          <KpiCard
            label={t(lang, "dashboard.paid")}
            value={formatMoney(kpi.data?.paid_total ?? 0, currency, lang)}
          />
          <KpiCard
            label={t(lang, "dashboard.outstanding")}
            value={formatMoney(kpi.data?.outstanding_total ?? 0, currency, lang)}
          />
          <KpiCard
            label={t(lang, "reports.bestMonth")}
            value={peak ? monthName(peak.month, lang) : "—"}
            hint={peak ? formatMoney(peak.total, currency, lang) : undefined}
          />
        </div>
      )}

      <MonthlyRevenueChart
        rows={rows}
        year={year}
        currency={currency}
        lang={lang}
        loading={loading}
      />

      <Card padded={false} title={`${t(lang, "dashboard.revenue")} — ${year}`}>
        {loading ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={6} />
          </div>
        ) : (
          <Table
            columns={columns}
            rows={sortedRows}
            rowKey={(row) => String(row.month)}
            sort={sort}
            onSortChange={setSort}
            empty={<EmptyState title={t(lang, "reports.noRevenue")} />}
          />
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------- the chart

export interface MonthlyRevenueChartProps {
  rows: MonthRow[];
  year: number;
  currency: string;
  lang?: Lang;
  loading?: boolean;
  height?: number;
}

const VIEW_W = 720;
const VIEW_H = 200;
const AXIS_H = 22;
const GAP = 8;

/**
 * Twelve bars, scaled to the tallest month. Composed here rather than added to
 * @henrioutai/ui as a "RevenueChart": a chart that knows about months and
 * invoice totals is product logic, and the design system deliberately holds
 * none. ChartWrapper is the shared part, and it already exists.
 */
export function MonthlyRevenueChart({
  rows,
  year,
  currency,
  lang = "en",
  loading,
  height = 240,
}: MonthlyRevenueChartProps) {
  const byMonth = new Map(rows.map((row) => [row.month, row.total]));
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    total: byMonth.get(index + 1) ?? "0",
  }));

  const peak = months.reduce((max, row) => Math.max(max, Number(row.total)), 0);
  const hasData = peak > 0;

  const plotH = VIEW_H - AXIS_H;
  const slot = VIEW_W / 12;
  const barW = slot - GAP;

  return (
    <ChartWrapper
      title={t(lang, "reports.invoicedPerMonth")}
      subtitle={String(year)}
      height={height}
      loading={loading}
      empty={hasData ? undefined : <EmptyState title={t(lang, "reports.noRevenue")} />}
      caption={t(lang, "reports.revenueCaption")}
      legend={[
        {
          key: "invoiced",
          label: t(lang, "dashboard.invoiced"),
          color: "var(--bg-accent)",
        },
      ]}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${t(lang, "reports.invoicedPerMonth")} ${year}`}
      >
        <line
          x1="0"
          y1={plotH}
          x2={VIEW_W}
          y2={plotH}
          stroke="var(--bg-line)"
          strokeWidth="1"
        />
        {months.map((row) => {
          const value = Number(row.total);
          // A zero month still gets a 2px stub so the axis reads as twelve
          // slots rather than as a gap where data failed to arrive.
          const barH = hasData ? Math.max(2, (value / peak) * (plotH - 6)) : 2;
          const x = row.month * slot - slot + GAP / 2;
          return (
            <g key={row.month}>
              <title>
                {monthName(row.month, lang)} — {formatMoney(row.total, currency, lang)}
              </title>
              <rect
                x={x}
                y={plotH - barH}
                width={barW}
                height={barH}
                rx="3"
                fill="var(--bg-accent)"
                opacity={value > 0 ? 1 : 0.35}
              />
            </g>
          );
        })}
      </svg>
    </ChartWrapper>
  );
}

/** Compact status roll-up from /reports/kpi's own `counts` map. Rendered as
 *  badges rather than a chart: five integers do not need axes. */
export function InvoiceStatusCounts({
  counts,
  lang = "en",
}: {
  counts: Record<string, number> | undefined;
  lang?: Lang;
}) {
  const entries = Object.entries(counts ?? {});
  if (entries.length === 0) return null;
  return (
    <Card title={t(lang, "reports.byStatus")}>
      <div className="bg-report__counts">
        {entries.map(([status, count]) => (
          <span key={status} className="bg-report__count">
            <Badge tone="neutral">{status}</Badge>
            <span className="bg-num">{count}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}
