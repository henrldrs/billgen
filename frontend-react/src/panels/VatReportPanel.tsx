/** Output VAT for one declaration period.
 *
 *  `GET /reports/vat?period` answers for a year, a quarter or a month, which is
 *  exactly the set of Belgian declaration rhythms — so the period picker offers
 *  those three and nothing else. Every figure is the server's: invoices minus
 *  credit notes, per (category, rate), with the Belgian grid attached where the
 *  mapping is unambiguous.
 *
 *  The screen's most important job is a negative one. The response carries
 *  `covers: "output_vat_only"` because BillGen holds no purchases at all: there
 *  is no deductible VAT, no grids 59/81-83/86-87, and no 71/72 balance. A
 *  screen that let an accountant read this as a return ready to file would be
 *  a filing error with this product's name on it, so the caveat is a banner at
 *  the top — not a footnote, not a tooltip — and it is rendered from the
 *  server's own `covers` field rather than from a constant here.
 *
 *  `skipped_other_currency` gets the same treatment: a report denominated in
 *  one currency that silently dropped three USD invoices is a wrong number
 *  presented as a right one.
 *
 *  Grading: the plan matrix declares `vat_report` as basic/full/advanced/
 *  consolidated, and this screen hides the per-rate breakdown below "full".
 *  Note what that is and is not — the endpoint serves the whole report to every
 *  tier, because no `require_feature("vat_report")` guards it. The hiding is
 *  UX, and unlike the metered features it is not backed by a server refusal.
 *  Whether it should be is a product decision, not one to make in a panel.
 */

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
} from "@henrioutai/ui";

import { useEntitlements, useVatReport } from "../hooks/queries";
import { featureGrade } from "../lib/entitlements";
import { formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import { usePeriodPicker } from "./PeriodPicker";
import type { VatReportLineResponse } from "../types";

export interface VatReportPanelProps {
  companyId: string;
  lang?: Lang;
  /** Seed period, e.g. "2026-Q3". Defaults to the current quarter. */
  period?: string;
  yearsBack?: number;
}

/** The grades at which the per-rate breakdown is shown. "basic" is Free. */
const GRADES_WITH_BREAKDOWN = ["full", "advanced", "consolidated"];

export function VatReportPanel({
  companyId,
  lang = "en",
  period: seedPeriod,
  yearsBack = 4,
}: VatReportPanelProps) {
  const { period, controls } = usePeriodPicker({ lang, seed: seedPeriod, yearsBack });

  const report = useVatReport(companyId, period);
  const entitlements = useEntitlements();
  const grade = featureGrade(entitlements.data?.features, "vat_report");
  // Undefined while entitlements are still loading or unavailable: show the
  // breakdown rather than flashing a lock over data the server will serve.
  const showBreakdown = grade === undefined || GRADES_WITH_BREAKDOWN.includes(grade);

  if (report.isError) {
    return (
      <div className="bg-stack">
        <PageHeader title={t(lang, "vat.title")} />
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

  const data = report.data;
  const currency = data?.currency ?? "EUR";
  const money = (value: string) => formatMoney(value, currency, lang);

  const columns: TableColumn<VatReportLineResponse>[] = [
    { key: "category", label: t(lang, "vat.category") },
    { key: "rate", label: t(lang, "vat.rate"), numeric: true, render: (row) => `${row.rate}%` },
    {
      key: "grid",
      label: t(lang, "vat.grid"),
      // A null grid is a real answer — the sales-side mapping is unambiguous
      // only for some categories — so it is labelled, not blanked.
      render: (row) =>
        row.grid ? (
          <Badge tone="neutral">{row.grid}</Badge>
        ) : (
          <span className="bg-vat__unmapped">{t(lang, "vat.gridUnmapped")}</span>
        ),
    },
    {
      key: "invoiced_base",
      label: t(lang, "vat.invoicedBase"),
      numeric: true,
      render: (row) => money(row.invoiced_base),
    },
    {
      key: "invoiced_vat",
      label: t(lang, "vat.invoicedVat"),
      numeric: true,
      render: (row) => money(row.invoiced_vat),
    },
    {
      key: "credited_base",
      label: t(lang, "vat.creditedBase"),
      numeric: true,
      render: (row) => money(row.credited_base),
    },
    {
      key: "credited_vat",
      label: t(lang, "vat.creditedVat"),
      numeric: true,
      render: (row) => money(row.credited_vat),
    },
    {
      key: "net_base",
      label: t(lang, "vat.netBase"),
      numeric: true,
      render: (row) => money(row.net_base),
    },
    {
      key: "net_vat",
      label: t(lang, "vat.netVat"),
      numeric: true,
      render: (row) => money(row.net_vat),
    },
  ];

  return (
    <div className="bg-stack">
      <PageHeader title={t(lang, "vat.title")} subtitle={data?.period} />
      {controls}

      {/* Rendered from the server's own `covers`, so a future report that does
          include purchases stops claiming this by itself. */}
      {data?.covers === "output_vat_only" ? (
        <Banner tone="warn" title={t(lang, "vat.outputOnly")}>
          {t(lang, "vat.outputOnlyBody")}
        </Banner>
      ) : null}

      {data && data.skipped_other_currency > 0 ? (
        <Banner tone="danger" title={t(lang, "vat.otherCurrency")}>
          {t(lang, "vat.otherCurrencyBody")} ({data.skipped_other_currency})
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
          <KpiCard label={t(lang, "vat.netBase")} value={money(data.net_base)} />
          <KpiCard
            label={t(lang, "vat.netVat")}
            value={money(data.net_vat)}
            hint={`${data.period_start} → ${data.period_end}`}
          />
          <KpiCard label={t(lang, "vat.invoiceCount")} value={String(data.invoice_count)} />
          <KpiCard
            label={t(lang, "vat.creditNoteCount")}
            value={String(data.credit_note_count)}
          />
        </div>
      )}

      <Card padded={false} title={t(lang, "vat.breakdown")}>
        {report.isLoading || !data ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={5} />
          </div>
        ) : !showBreakdown ? (
          <div className="bg-report__skeleton">
            <EmptyState
              title={t(lang, "vat.breakdownLocked")}
              description={t(lang, "vat.breakdownLockedBody")}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            rows={data.lines}
            rowKey={(row) => `${row.category}-${row.rate}`}
            empty={<EmptyState title={t(lang, "vat.noLines")} />}
          />
        )}
      </Card>
    </div>
  );
}
