/** Invoices — counts and money per effective status, for one period.
 *
 *  Everything on this screen is `GET /reports/invoices`. That matters more than
 *  it sounds: the IA carried this node as "would have to be tallied in the
 *  browser, which is why it stays scaffolded" long after the endpoint existed,
 *  and the alternative it was refusing — fetch every invoice, group them in a
 *  useMemo, add up the totals — is the one thing this codebase will not do.
 *  Counting rows in React is a report that disagrees with the PDF as soon as
 *  the list is paginated, and money arithmetic in a component is money
 *  arithmetic nobody tested.
 *
 *  Two figures the server volunteers and this screen refuses to hide:
 *
 *  - **`skipped_other_currency`** — the report is denominated in ONE currency
 *    and silently dropping three USD invoices would be a wrong number wearing
 *    the clothes of a right one. Same treatment as the VAT report.
 *  - **`draft_count`** — drafts are counted but carry no money into any total,
 *    because a draft has no number and is not owed to anyone. The KPI says so
 *    rather than leaving someone to wonder why the columns do not add up.
 *
 *  "Effective status" is the server's: OVERDUE is derived from the due date at
 *  request time and is not a value any invoice row holds.
 */

import { useState } from "react";

import {
  Badge,
  Banner,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  Skeleton,
  Table,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";

import { useInvoiceReport } from "../hooks/queries";
import { formatMoney, monthName } from "../lib/format";
import { statusLabel, t, type Lang } from "../lib/translations";
import type { StatusBucketResponse } from "../types";
import { MonthlyRevenueChart } from "./RevenueReportPanel";
import { usePeriodPicker } from "./PeriodPicker";

export interface InvoicesReportPanelProps {
  companyId: string;
  lang?: Lang;
  /** Seed period, e.g. "2026-Q3". Defaults to the current quarter. */
  period?: string;
  yearsBack?: number;
}

interface MonthRow {
  month: string;
  count: number;
  total: string;
}

export function InvoicesReportPanel({
  companyId,
  lang = "en",
  period: seedPeriod,
  yearsBack = 4,
}: InvoicesReportPanelProps) {
  const { period, controls } = usePeriodPicker({ lang, seed: seedPeriod, yearsBack });
  const [sort, setSort] = useState<TableSort>({ key: "count", direction: "desc" });

  const report = useInvoiceReport(companyId, { period });
  const data = report.data;
  const currency = data?.currency ?? "EUR";
  const money = (value: string) => formatMoney(value, currency, lang);

  // Both maps are keyed "YYYY-MM" by the server and already sorted. Zipping
  // them is not arithmetic — every number below is printed as it arrived.
  const months: MonthRow[] = Object.entries(data?.by_month ?? {}).map(([month, total]) => ({
    month,
    count: data?.count_by_month?.[month] ?? 0,
    total: String(total),
  }));

  const statusColumns: TableColumn<StatusBucketResponse>[] = [
    {
      key: "status",
      label: t(lang, "history.status"),
      render: (row) =>
        row.status === "overdue" ? (
          <Badge tone="warn">{row.status}</Badge>
        ) : (
          <Badge status={row.status as "issued" | "paid" | "draft"}>
            {statusLabel(lang, row.status)}
          </Badge>
        ),
    },
    {
      key: "count",
      label: t(lang, "reports.count"),
      numeric: true,
      sortable: true,
      render: (row) => String(row.count),
    },
    {
      key: "total_ttc",
      label: t(lang, "history.total"),
      numeric: true,
      sortable: true,
      render: (row) => money(row.total_ttc),
    },
  ];

  const monthColumns: TableColumn<MonthRow>[] = [
    {
      key: "month",
      label: t(lang, "vat.month"),
      render: (row) => {
        const [year, month] = row.month.split("-");
        return `${monthName(Number(month), lang)} ${year}`;
      },
    },
    {
      key: "count",
      label: t(lang, "reports.count"),
      numeric: true,
      render: (row) => String(row.count),
    },
    {
      key: "total",
      label: t(lang, "history.total"),
      numeric: true,
      render: (row) => money(row.total),
    },
  ];

  const sortedStatuses = [...(data?.statuses ?? [])].sort((a, b) => {
    const direction = sort.direction === "asc" ? 1 : -1;
    const left = sort.key === "total_ttc" ? Number(a.total_ttc) : a.count;
    const right = sort.key === "total_ttc" ? Number(b.total_ttc) : b.count;
    return left === right ? 0 : (left < right ? -1 : 1) * direction;
  });

  if (report.isError) {
    return (
      <div className="bg-stack">
        <PageHeader title={t(lang, "invoiceReport.title")} />
        {controls}
        <Card>
          <ErrorState
            title={t(lang, "common.error")}
            onRetry={() => void report.refetch()}
            retryLabel={t(lang, "common.retry")}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-stack">
      <PageHeader
        title={t(lang, "invoiceReport.title")}
        subtitle={data ? `${data.period_start} → ${data.period_end}` : undefined}
      />
      {controls}

      {data && data.skipped_other_currency > 0 ? (
        <Banner tone="warn" title={t(lang, "invoiceReport.mixedCurrency")}>
          {`${data.skipped_other_currency} · ${t(lang, "invoiceReport.mixedCurrencyBody")}`}
        </Banner>
      ) : null}

      {report.isLoading || !data ? (
        <div className="bg-kpi-grid">
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
        </div>
      ) : (
        <div className="bg-kpi-grid">
          <KpiCard
            label={t(lang, "invoiceReport.invoiced")}
            value={money(data.invoiced_total)}
            hint={`${data.invoice_count} · ${t(lang, "invoiceReport.countHint")}`}
          />
          <KpiCard label={t(lang, "invoiceReport.paid")} value={money(data.paid_total)} />
          <KpiCard
            label={t(lang, "dashboard.outstanding")}
            value={money(data.outstanding_total)}
          />
          <KpiCard
            label={t(lang, "dashboard.overdue")}
            value={money(data.overdue_total)}
            hint={`${data.overdue_count} · ${t(lang, "invoiceReport.overdueHint")}`}
          />
          <KpiCard
            label={t(lang, "invoiceReport.drafts")}
            value={String(data.draft_count)}
            hint={t(lang, "invoiceReport.draftsHint")}
          />
        </div>
      )}

      <MonthlyRevenueChart
        rows={months.map((row) => ({ month: Number(row.month.split("-")[1]), total: row.total }))}
        year={Number((data?.period_start ?? period).slice(0, 4))}
        currency={currency}
        lang={lang}
        loading={report.isLoading}
      />

      <Card padded={false} title={t(lang, "reports.byStatus")}>
        {report.isLoading || !data ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={5} />
          </div>
        ) : (
          <Table
            columns={statusColumns}
            rows={sortedStatuses}
            rowKey={(row) => row.status}
            sort={sort}
            onSortChange={setSort}
            empty={<EmptyState title={t(lang, "invoiceReport.none")} />}
          />
        )}
      </Card>

      <Card padded={false} title={t(lang, "reports.invoicedPerMonth")}>
        {report.isLoading || !data ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={5} />
          </div>
        ) : (
          <Table
            columns={monthColumns}
            rows={months}
            rowKey={(row) => row.month}
            empty={<EmptyState title={t(lang, "invoiceReport.none")} />}
          />
        )}
      </Card>
    </div>
  );
}
