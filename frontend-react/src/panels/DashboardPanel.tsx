/** Dashboard — the four KPIs and the revenue year, both server-computed.
 *
 *  The title row belongs to the route (pages/routes.tsx renders a PageHeader
 *  above this), so this panel renders only its own content; an <h1> here made
 *  every dashboard carry two.
 */

import {
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  Skeleton,
  Table,
  type TableColumn,
} from "@henrioutai/ui";

import { useKpi, useRevenue } from "../hooks/queries";
import { formatMoney, monthName } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import { MonthlyRevenueChart } from "./RevenueReportPanel";

export interface DashboardPanelProps {
  companyId: string;
  lang?: Lang;
  year?: number;
  /** ISO date used as "today" for overdue computation — mainly for tests. */
  today?: string;
  /** Currency to label the KPI figures with. /reports/kpi returns bare
   *  decimals, so the shell passes the active company's default. */
  currency?: string;
}

interface MonthRow {
  month: number;
  total: string;
}

export function DashboardPanel({
  companyId,
  lang = "en",
  year = new Date().getFullYear(),
  today,
  currency = "EUR",
}: DashboardPanelProps) {
  const kpi = useKpi(companyId, today);
  const revenue = useRevenue(companyId, year);

  if (kpi.isError || revenue.isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => {
            void kpi.refetch();
            void revenue.refetch();
          }}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  const loading = kpi.isLoading || revenue.isLoading;

  const rows: MonthRow[] = Object.entries(revenue.data?.months ?? {})
    .map(([month, total]) => ({ month: Number(month), total: String(total) }))
    .sort((a, b) => a.month - b.month);

  const columns: TableColumn<MonthRow>[] = [
    {
      key: "month",
      label: t(lang, "dashboard.month"),
      render: (row) => monthName(row.month, lang),
    },
    {
      key: "total",
      label: t(lang, "dashboard.invoiced"),
      numeric: true,
      render: (row) => formatMoney(row.total, currency, lang),
    },
  ];

  return (
    <section className="bg-stack" aria-label={t(lang, "dashboard.title")}>
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
            label={t(lang, "dashboard.overdue")}
            value={String(kpi.data?.overdue_count ?? 0)}
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
            <Skeleton lines={4} />
          </div>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.month)}
            empty={<EmptyState title={t(lang, "reports.noRevenue")} />}
          />
        )}
      </Card>
    </section>
  );
}
