/** Payments — money that actually arrived, across every invoice.
 *
 *  The one view the product did not have: every other payment surface is
 *  anchored to an invoice you already picked. `GET /payments?company_id` with a
 *  date window is what an accountant asks for at the end of a month — what came
 *  in, when, and against what.
 *
 *  **The total is the server's.** This screen printed no headline figure for as
 *  long as there was no `/reports/payments` to print, because adding the rows up
 *  here would put money arithmetic in a React component — and it would sum the
 *  visible *page* rather than the filter, and be wrong the moment two currencies
 *  appear in the window.
 *
 *  All three problems stay solved by asking the server instead of by summing:
 *  `usePaymentReport` sends the same `paid_from`/`paid_to` the list sends, so the
 *  headline describes exactly the rows underneath it; and payments in any other
 *  currency are reported in `skipped_other_currency` rather than added at face
 *  value, so a mixed window says so instead of quietly under-reporting.
 *
 *  The invoice reference and client name are a LOOKUP, not a filter: a payment
 *  carries `invoice_id` and nothing else, so the invoice list is read to turn
 *  that id into something a person recognises. A payment whose invoice is not
 *  in that list still renders — with its id — rather than vanishing.
 */

import { useMemo, useState } from "react";

import {
  Button,
  Card,
  DatePicker,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  PageHeader,
  Pagination,
  Skeleton,
  Table,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";

import {
  useClients,
  useInvoices,
  usePaymentReport,
  usePaymentsList,
} from "../hooks/queries";
import { formatDate, formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import type { PaymentResponse } from "../types";

const PAGE_SIZE = 25;

export interface PaymentsReportPanelProps {
  companyId: string;
  lang?: Lang;
  /** Open the invoice a payment was recorded against. Rows are inert without it. */
  onOpenInvoice?: (invoiceId: string) => void;
}

export function PaymentsReportPanel({
  companyId,
  lang = "en",
  onOpenInvoice,
}: PaymentsReportPanelProps) {
  const [paidFrom, setPaidFrom] = useState<string | null>(null);
  const [paidTo, setPaidTo] = useState<string | null>(null);
  const [sort, setSort] = useState<TableSort>({ key: "paid_on", direction: "desc" });
  const [page, setPage] = useState(1);

  // The window is the SERVER's: paid_from / paid_to are query parameters, so
  // narrowing it fetches less rather than hiding more.
  const payments = usePaymentsList({
    companyId,
    paidFrom: paidFrom ?? undefined,
    paidTo: paidTo ?? undefined,
  });
  // The same window the list is filtered by, so the headline and the rows can
  // never describe different money. Not derived from `payments.data`: that is
  // paginated below, so summing it would total the visible page.
  const report = usePaymentReport(companyId, {
    paidFrom: paidFrom ?? undefined,
    paidTo: paidTo ?? undefined,
  });
  const invoices = useInvoices({ companyId });
  const { data: clients } = useClients(companyId);

  const invoiceIndex = useMemo(() => {
    const index = new Map<string, { reference: string | null; clientId: string }>();
    for (const invoice of invoices.data ?? []) {
      index.set(invoice.id, { reference: invoice.reference, clientId: invoice.client_id });
    }
    return index;
  }, [invoices.data]);

  const clientName = useMemo(() => {
    const index = new Map<string, string>();
    for (const client of clients ?? []) index.set(client.id, client.name);
    return (id: string | undefined) => (id ? (index.get(id) ?? "—") : "—");
  }, [clients]);

  const rows = useMemo(() => {
    const collected = [...(payments.data ?? [])];
    const direction = sort.direction === "asc" ? 1 : -1;
    const pick = (row: PaymentResponse) => {
      switch (sort.key) {
        case "invoice":
          return invoiceIndex.get(row.invoice_id)?.reference ?? "";
        case "client":
          return clientName(invoiceIndex.get(row.invoice_id)?.clientId);
        case "amount":
          return Number(row.amount);
        case "method":
          return row.method;
        default:
          return row.paid_on;
      }
    };
    return collected.sort((a, b) => {
      const left = pick(a);
      const right = pick(b);
      if (left === right) return 0;
      return (left < right ? -1 : 1) * direction;
    });
  }, [payments.data, sort, invoiceIndex, clientName]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<PaymentResponse>[] = [
    {
      key: "paid_on",
      label: t(lang, "payments.paidOn"),
      sortable: true,
      render: (row) => formatDate(row.paid_on, lang),
    },
    {
      key: "invoice",
      label: t(lang, "payments.invoice"),
      sortable: true,
      render: (row) => (
        <span className="bg-num">
          {/* An invoice outside the fetched list still shows something to go on
              — never a blank cell for a payment that certainly exists. */}
          {invoiceIndex.get(row.invoice_id)?.reference ?? row.invoice_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "client",
      label: t(lang, "invoice.client"),
      sortable: true,
      render: (row) => clientName(invoiceIndex.get(row.invoice_id)?.clientId),
    },
    {
      key: "method",
      label: t(lang, "payments.method"),
      sortable: true,
      render: (row) => row.method,
    },
    {
      key: "reference",
      label: t(lang, "history.reference"),
      render: (row) => row.reference ?? "—",
    },
    {
      key: "amount",
      label: t(lang, "payments.amount"),
      numeric: true,
      sortable: true,
      render: (row) => formatMoney(row.amount, row.currency, lang),
    },
  ];

  if (payments.isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => void payments.refetch()}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  return (
    <div className="bg-stack">
      <PageHeader title={t(lang, "payments.title")} subtitle={t(lang, "payments.subtitle")} />

      {report.isLoading ? (
        <div className="bg-kpi-grid">
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
        </div>
      ) : report.data ? (
        <div className="bg-kpi-grid">
          <KpiCard
            label={t(lang, "payments.received")}
            value={formatMoney(report.data.total, report.data.currency, lang)}
            hint={`${report.data.payment_count} · ${t(lang, "payments.receivedHint")}`}
          />
          <KpiCard
            label={t(lang, "payments.largest")}
            value={formatMoney(report.data.largest, report.data.currency, lang)}
            // Shown only when there is something to disclose. A window with no
            // foreign-currency payment should not carry a note about them, and a
            // window that has them must not look complete.
            hint={
              report.data.skipped_other_currency > 0
                ? `${report.data.skipped_other_currency} · ${t(lang, "payments.otherCurrency")}`
                : undefined
            }
          />
        </div>
      ) : null}

      <Card>
        <div className="bg-companyform__grid">
          <Field label={t(lang, "payments.from")}>
            <DatePicker
              value={paidFrom}
              onChange={(value) => {
                setPaidFrom(value);
                setPage(1);
              }}
            />
          </Field>
          <Field label={t(lang, "payments.to")}>
            <DatePicker
              value={paidTo}
              onChange={(value) => {
                setPaidTo(value);
                setPage(1);
              }}
            />
          </Field>
        </div>
        {paidFrom || paidTo ? (
          <div className="bg-companyform__actions">
            <Button
              variant="ghost"
              onClick={() => {
                setPaidFrom(null);
                setPaidTo(null);
                setPage(1);
              }}
            >
              {t(lang, "payments.clearWindow")}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card padded={false}>
        {payments.isLoading ? (
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
              onRowClick={onOpenInvoice ? (row) => onOpenInvoice(row.invoice_id) : undefined}
              empty={<EmptyState title={t(lang, "payments.none")} />}
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
