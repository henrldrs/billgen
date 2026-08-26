/** Receivables — the two report screens that read money the company is owed.
 *
 *    outstanding   issued + partially paid: billed, not yet in the bank
 *    overdue       what the server itself has moved to OVERDUE
 *
 *  One panel, two modes, because the only difference is which statuses the
 *  server is asked for. The headline figures come from /reports/kpi and the
 *  rows from /invoices?status=… — both server-side. Nothing here filters a
 *  full list in the browser, and nothing here adds anything up: the totals
 *  strip prints exactly the two figures /reports/kpi returns.
 */

import { useMemo, useState } from "react";

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  Pagination,
  Skeleton,
  Table,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";

import { useClients, useInvoices, useKpi } from "../hooks/queries";
import { formatDate, formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import type { InvoiceResponse } from "../types";

const PAGE_SIZE = 25;

export type ReceivablesMode = "outstanding" | "overdue";

/** Which server-side status filters each mode asks for. Never a client-side
 *  predicate over the whole list — /invoices takes a status parameter. */
const STATUSES: Record<ReceivablesMode, string[]> = {
  outstanding: ["issued", "partially_paid"],
  overdue: ["overdue"],
};

export interface ReceivablesPanelProps {
  companyId: string;
  mode: ReceivablesMode;
  lang?: Lang;
  /** Open one invoice's record screen. Rows are inert without it. */
  onOpenInvoice?: (invoiceId: string) => void;
}

export function ReceivablesPanel({
  companyId,
  mode,
  lang = "en",
  onOpenInvoice,
}: ReceivablesPanelProps) {
  const [sort, setSort] = useState<TableSort>({ key: "due_date", direction: "asc" });
  const [page, setPage] = useState(1);

  const kpi = useKpi(companyId);
  const { data: clients } = useClients(companyId);

  // Two fixed statuses at most, so two fixed hook calls — a .map() over
  // STATUSES here would be a conditional hook, which React forbids. In overdue
  // mode the second call is aimed at the SAME status as the first so React
  // Query dedupes it against the cache; leaving its status undefined would
  // quietly fetch the whole unfiltered list on a screen that must never show it.
  const usesSecondary = mode === "outstanding";
  const primary = useInvoices({ companyId, status: STATUSES[mode][0] });
  const secondary = useInvoices({
    companyId,
    status: usesSecondary ? STATUSES.outstanding[1] : STATUSES.overdue[0],
  });

  const clientName = useMemo(() => {
    const index = new Map<string, string>();
    for (const client of clients ?? []) index.set(client.id, client.name);
    return (id: string) => index.get(id) ?? "—";
  }, [clients]);

  const rows = useMemo(() => {
    const collected = [
      ...(primary.data ?? []),
      ...(usesSecondary ? (secondary.data ?? []) : []),
    ];
    const direction = sort.direction === "asc" ? 1 : -1;
    const pick = (row: InvoiceResponse) => {
      switch (sort.key) {
        case "reference":
          return row.reference ?? "";
        case "client":
          return clientName(row.client_id);
        case "total_ttc":
          return Number(row.total_ttc);
        case "issue_date":
          return row.issue_date;
        default:
          // A draft-less list always has an issue date; due_date may be null,
          // and a null sorts last rather than jumping to the top.
          return row.due_date ?? "9999-12-31";
      }
    };
    return collected.sort((a, b) => {
      const left = pick(a);
      const right = pick(b);
      if (left === right) return 0;
      return (left < right ? -1 : 1) * direction;
    });
  }, [primary.data, secondary.data, usesSecondary, sort, clientName]);

  const isLoading =
    kpi.isLoading || primary.isLoading || (usesSecondary && secondary.isLoading);
  const isError = kpi.isError || primary.isError || (usesSecondary && secondary.isError);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<InvoiceResponse>[] = [
    {
      key: "reference",
      label: t(lang, "history.reference"),
      sortable: true,
      render: (row) => (
        <span className="bg-num">{row.reference ?? t(lang, "history.draft")}</span>
      ),
    },
    {
      key: "client",
      label: t(lang, "invoice.client"),
      sortable: true,
      render: (row) => clientName(row.client_id),
    },
    {
      key: "issue_date",
      label: t(lang, "history.date"),
      sortable: true,
      render: (row) => formatDate(row.issue_date, lang),
    },
    {
      key: "due_date",
      label: t(lang, "reports.dueDate"),
      sortable: true,
      render: (row) => (row.due_date ? formatDate(row.due_date, lang) : "—"),
    },
    {
      key: "status",
      label: t(lang, "history.status"),
      // Badge's status set mirrors InvoiceStatus except for OVERDUE, which the
      // design system has no colour for — a warn tone rather than an invented
      // modifier class.
      render: (row) =>
        row.status === "overdue" ? (
          <Badge tone="warn">{row.status}</Badge>
        ) : (
          <Badge status={row.status as "issued" | "partially_paid"} />
        ),
    },
    {
      key: "total_ttc",
      label: t(lang, "history.total"),
      numeric: true,
      sortable: true,
      render: (row) => formatMoney(row.total_ttc, row.currency, lang),
    },
  ];

  if (isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => {
            void kpi.refetch();
            void primary.refetch();
            if (usesSecondary) void secondary.refetch();
          }}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  const currency = visible[0]?.currency ?? "EUR";

  return (
    <div className="bg-stack">
      {isLoading ? (
        <div className="bg-kpi-grid">
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
        </div>
      ) : (
        <div className="bg-kpi-grid">
          <KpiCard
            label={t(lang, "dashboard.outstanding")}
            value={formatMoney(kpi.data?.outstanding_total ?? 0, currency, lang)}
            hint={t(
              lang,
              mode === "overdue" ? "reports.overdueHint" : "reports.outstandingHint",
            )}
          />
          <KpiCard
            label={t(lang, "dashboard.overdue")}
            value={String(kpi.data?.overdue_count ?? 0)}
          />
        </div>
      )}

      <Card padded={false}>
        {isLoading ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={6} />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              rows={visible}
              rowKey={(row) => row.id}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setPage(1);
              }}
              onRowClick={onOpenInvoice ? (row) => onOpenInvoice(row.id) : undefined}
              empty={
                <EmptyState
                  title={t(
                    lang,
                    mode === "overdue" ? "reports.noOverdue" : "reports.noOutstanding",
                  )}
                />
              }
            />
            {pageCount > 1 ? (
              <div className="bg-report__pagination">
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
