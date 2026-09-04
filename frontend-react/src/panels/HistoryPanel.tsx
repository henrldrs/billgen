/** Invoice history: filter by status, void, issue credit note, record payment.
 *  Corrections follow the Belgian-clean path — the credit-note action is the
 *  primary correction; void exists for pre-send mistakes. */

import { useMemo, useState, type FormEvent } from "react";

import {
  Badge,
  Banner,
  Button,
  Card,
  DatePicker,
  DocumentSheet,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Table,
  Textarea,
  TextInput,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";
import {
  useClient,
  useCompany,
  useDeleteInvoice,
  useInvoices,
  useIssueCreditNote,
  useIssueInvoice,
  useRecordPayment,
  useVoidInvoice,
} from "../hooks/queries";
import { ApiError } from "../lib/apiClient";
import { documentFilename, saveBlob } from "../lib/download";
import { formatDate, formatMoney } from "../lib/format";
import { t, tPeppolError, type Lang } from "../lib/translations";
import { InvoiceDocument } from "./InvoiceDocument";
import { useApi } from "../providers/BillGenProvider";
import type { InvoiceResponse } from "../types";

export interface HistoryPanelProps {
  companyId: string;
  lang?: Lang;
  /**
   * Lock the list to one invoice status. Supplied by the /sales/invoices/:status
   * routes, where the tab itself IS the filter — the in-panel dropdown is hidden
   * so there are never two competing controls for the same thing. Mount with a
   * `key` of the status so switching tabs remounts with the new seed.
   */
  status?: string;
  /** Open one invoice's full record screen. The sheet is the quick look at the
   *  document; this is the whole record — its lines, payments and audit
   *  history — with the actions that are not on the sheet. */
  onOpenInvoice?: (invoiceId: string) => void;
}

type ActionKind = "void" | "credit_note" | "payment" | "issue" | "delete";

interface PendingAction {
  kind: ActionKind;
  invoiceId: string;
  reference: string;
}

const STATUS_FILTERS = [
  "",
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "voided",
] as const;

const PAGE_SIZE = 25;

export function HistoryPanel({
  companyId,
  lang = "en",
  status,
  onOpenInvoice,
}: HistoryPanelProps) {
  const routeFiltered = status !== undefined;
  const [statusFilter, setStatusFilter] = useState(status ?? "");
  const { data: invoices, isLoading, isError } = useInvoices({
    companyId,
    status: statusFilter || undefined,
  });

  const api = useApi();
  const voidInvoice = useVoidInvoice();
  const issueInvoice = useIssueInvoice();
  const deleteInvoice = useDeleteInvoice();
  const issueCreditNote = useIssueCreditNote();
  const recordPayment = useRecordPayment();

  // Downloads are read-only re-renders of an issued invoice — no new data, no
  // sequence consumed (the server only appends an export audit entry).
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);
  const [peppolErrors, setPeppolErrors] = useState<string[]>([]);

  const download = async (kind: "pdf" | "xml", invoiceId: string, reference: string) => {
    const key = `${invoiceId}:${kind}`;
    const filename = documentFilename(reference, kind);
    setDownloading(key);
    setDownloadFailed(false);
    setDownloadedFile(null);
    setPeppolErrors([]);
    try {
      const blob =
        kind === "pdf"
          ? await api.invoicePdf(invoiceId)
          : await api.invoicePeppolXml(invoiceId);
      if (await saveBlob(blob, filename)) setDownloadedFile(filename);
    } catch (err) {
      if (err instanceof ApiError && err.errors.length > 0) {
        // Peppol export gate: show exactly which fields block the export.
        setPeppolErrors(err.errors.map((e) => e.message_key));
      } else {
        setDownloadFailed(true);
      }
    } finally {
      setDownloading(null);
    }
  };

  const [action, setAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState<string | null>(null);

  const closeAction = () => {
    setAction(null);
    setReason("");
    setAmount("");
    setPaidOn(null);
  };

  const handleActionSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!action) return;
    if (action.kind === "void") {
      voidInvoice.mutate(
        { invoiceId: action.invoiceId, reason },
        { onSuccess: closeAction },
      );
    } else if (action.kind === "issue") {
      issueInvoice.mutate(action.invoiceId, { onSuccess: closeAction });
    } else if (action.kind === "delete") {
      deleteInvoice.mutate(action.invoiceId, { onSuccess: closeAction });
    } else if (action.kind === "credit_note") {
      issueCreditNote.mutate(
        { invoice_id: action.invoiceId, reason },
        { onSuccess: closeAction },
      );
    } else if (paidOn) {
      recordPayment.mutate(
        { invoice_id: action.invoiceId, amount, paid_on: paidOn },
        { onSuccess: closeAction },
      );
    }
  };

  // The sheet is addressed by id rather than by holding the invoice object, so
  // it re-reads from the refreshed list after a mutation instead of showing a
  // stale copy of the row that was clicked.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = invoices?.find((invoice) => invoice.id === selectedId);

  // The two records the document draws its party blocks from. Both hooks are
  // declared here, unconditionally, above every early return in this component
  // — a hook placed next to the sheet it feeds would run only while the sheet
  // is open, which is the exact "rendered more hooks than during the previous
  // render" crash this codebase has already shipped twice. `useClient` is
  // internally disabled until it has an id, so the closed state costs nothing.
  const { data: company } = useCompany(companyId);
  const { data: documentClient } = useClient(selected?.client_id);

  const [sort, setSort] = useState<TableSort>({ key: "issue_date", direction: "desc" });
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const rows = [...(invoices ?? [])];
    const direction = sort.direction === "asc" ? 1 : -1;
    const pick = (row: InvoiceResponse) => {
      switch (sort.key) {
        case "reference":
          // Drafts have no number yet, so they sort together at one end rather
          // than interleaving with the numbered invoices.
          return row.reference ?? "";
        case "total_ttc":
          return Number(row.total_ttc);
        case "status":
          return row.status;
        default:
          return row.issue_date;
      }
    };
    rows.sort((a, b) => {
      const left = pick(a);
      const right = pick(b);
      if (left === right) return 0;
      return (left < right ? -1 : 1) * direction;
    });
    return rows;
  }, [invoices, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<InvoiceResponse>[] = [
    {
      key: "reference",
      label: t(lang, "history.reference"),
      sortable: true,
      render: (invoice) => (
        <span className="bg-num">{invoice.reference ?? t(lang, "history.draft")}</span>
      ),
    },
    {
      key: "issue_date",
      label: t(lang, "history.date"),
      sortable: true,
      render: (invoice) => formatDate(invoice.issue_date, lang),
    },
    {
      key: "total_ttc",
      label: t(lang, "history.total"),
      numeric: true,
      sortable: true,
      render: (invoice) => formatMoney(invoice.total_ttc, invoice.currency, lang),
    },
    {
      key: "status",
      label: t(lang, "history.status"),
      sortable: true,
      // OVERDUE is the one InvoiceStatus member Badge has no colour for; a warn
      // tone rather than an invented modifier class.
      render: (invoice) =>
        invoice.status === "overdue" ? (
          <Badge tone="warn">{invoice.status}</Badge>
        ) : (
          <Badge status={invoice.status as never} />
        ),
    },
  ];

  if (isError) {
    return (
      <Card>
        <ErrorState title={t(lang, "common.error")} />
      </Card>
    );
  }

  const actionPending =
    voidInvoice.isPending ||
    issueInvoice.isPending ||
    deleteInvoice.isPending ||
    issueCreditNote.isPending ||
    recordPayment.isPending;
  const actionFailed =
    voidInvoice.isError ||
    issueInvoice.isError ||
    deleteInvoice.isError ||
    issueCreditNote.isError ||
    recordPayment.isError;
  const isConfirmOnly = action?.kind === "issue" || action?.kind === "delete";

  return (
    <section className="bg-stack" aria-label={t(lang, "history.title")}>
      {/* The route already renders a PageHeader with this title, so the panel
          owns only its filter — two <h1>s on one screen was the old shape. */}
      {routeFiltered ? null : (
        <div className="bg-report__controls">
          <Field label={t(lang, "history.status")}>
            <Select
              value={statusFilter}
              options={STATUS_FILTERS.map((option) => ({
                value: option,
                label: option === "" ? t(lang, "history.all") : option,
              }))}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>
      )}

      {downloadFailed ? (
        <Banner tone="danger" onDismiss={() => setDownloadFailed(false)}>
          {t(lang, "history.downloadError")}
        </Banner>
      ) : null}

      {peppolErrors.length > 0 ? (
        <Banner
          tone="danger"
          title={t(lang, "history.peppolBlocked")}
          onDismiss={() => setPeppolErrors([])}
        >
          <ul>
            {peppolErrors.map((key) => (
              <li key={key}>{tPeppolError(lang, key)}</li>
            ))}
          </ul>
        </Banner>
      ) : null}

      {downloadedFile ? (
        <Banner tone="success" onDismiss={() => setDownloadedFile(null)}>
          {t(lang, "history.downloadSaved")} {downloadedFile}
        </Banner>
      ) : null}

      <Card padded={false}>
        {isLoading ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={6} />
          </div>
        ) : (
          <>
            <Table
              // Named because the record sheet that opens over this list
              // carries the invoice's own line table, and two unnamed tables on
              // screen at once are indistinguishable to a screen reader.
              label={t(lang, "history.title")}
              columns={columns}
              rows={visible}
              rowKey={(invoice) => invoice.id}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setPage(1);
              }}
              onRowClick={(invoice) => setSelectedId(invoice.id)}
              empty={<EmptyState title={t(lang, "history.empty")} />}
            />
            {pageCount > 1 ? (
              <div className="bg-report__pagination">
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </Card>

      {/* N3 — the record inspector, as the document itself.
          Henri, 2026-09-04: it was a right-hand drawer, which put the invoice
          in a column narrower than its own line table and stacked it between
          the floating top bar and a blurred page. It is now a centred sheet of
          paper carrying the real line table — see InvoiceDocument for why that
          illustration is deliberately not the authoritative render.

          Every action lives under the paper rather than in the row: a row that
          ends in five equal-weight buttons makes none of them readable, and
          Menu cannot be used inside Table because .bg-table-wrap clips it. */}
      <DocumentSheet
        open={selected !== undefined}
        onClose={() => setSelectedId(null)}
        title={selected ? (selected.reference ?? t(lang, "history.draft")) : ""}
        footer={
          selected ? (
            <>
              {onOpenInvoice ? (
                <Button variant="secondary" onClick={() => onOpenInvoice(selected.id)}>
                  {t(lang, "invoiceDetail.open")}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                disabled={downloading === `${selected.id}:pdf`}
                onClick={() =>
                  void download("pdf", selected.id, selected.reference ?? `draft-${selected.id}`)
                }
              >
                {t(lang, "history.downloadPdf")}
              </Button>

              {/* Issued invoices only: a draft has no gapless number, so it can
                  neither be exported to Peppol nor corrected by a credit note. */}
              {selected.status !== "draft" && selected.status !== "voided" ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={downloading === `${selected.id}:xml`}
                    onClick={() =>
                      void download("xml", selected.id, selected.reference ?? selected.id)
                    }
                  >
                    {t(lang, "history.downloadXml")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setAction({
                        kind: "payment",
                        invoiceId: selected.id,
                        reference: selected.reference ?? selected.id,
                      })
                    }
                  >
                    {t(lang, "history.payment")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setAction({
                        kind: "credit_note",
                        invoiceId: selected.id,
                        reference: selected.reference ?? selected.id,
                      })
                    }
                  >
                    {t(lang, "history.creditNote")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setAction({
                        kind: "void",
                        invoiceId: selected.id,
                        reference: selected.reference ?? selected.id,
                      })
                    }
                  >
                    {t(lang, "history.void")}
                  </Button>
                </>
              ) : null}

              {selected.status === "draft" ? (
                <>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setAction({
                        kind: "delete",
                        invoiceId: selected.id,
                        reference: t(lang, "history.draft"),
                      })
                    }
                  >
                    {t(lang, "history.delete")}
                  </Button>
                  <Button
                    onClick={() =>
                      setAction({
                        kind: "issue",
                        invoiceId: selected.id,
                        reference: t(lang, "history.draft"),
                      })
                    }
                  >
                    {t(lang, "history.issue")}
                  </Button>
                </>
              ) : null}
            </>
          ) : null
        }
      >
        {selected ? (
          <InvoiceDocument
            invoice={selected}
            company={company}
            client={documentClient}
            lang={lang}
          />
        ) : null}
      </DocumentSheet>

      <Modal
        open={action !== null}
        title={action ? `${t(lang, `history.${action.kind === "credit_note" ? "creditNote" : action.kind}` as never)} — ${action.reference}` : ""}
        onClose={closeAction}
      >
        <form onSubmit={handleActionSubmit}>
          {action?.kind === "payment" ? (
            <>
              <Field label={t(lang, "history.paymentAmount")} required>
                <TextInput
                  value={amount}
                  required
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Field label={t(lang, "history.paymentDate")} required>
                <DatePicker value={paidOn} onChange={setPaidOn} />
              </Field>
            </>
          ) : isConfirmOnly ? (
            <p>
              {t(
                lang,
                action?.kind === "issue" ? "history.issueConfirm" : "history.deleteConfirm",
              )}
            </p>
          ) : (
            <Field
              label={t(
                lang,
                action?.kind === "void" ? "history.voidReason" : "history.creditNoteReason",
              )}
              required
            >
              <Textarea
                value={reason}
                required
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
          )}
          {actionFailed ? <div role="alert">{t(lang, "common.error")}</div> : null}
          <div className="bg-panel__actions">
            <Button variant="secondary" onClick={closeAction}>
              {t(lang, "common.cancel")}
            </Button>
            <Button
              type="submit"
              variant={action?.kind === "delete" ? "danger" : "primary"}
              // The calendar returns null until a day is picked, and paid_on is
              // required by the API — `required` on a native input cannot see a
              // controlled null.
              disabled={actionPending || (action?.kind === "payment" && !paidOn)}
            >
              {t(lang, isConfirmOnly ? "history.confirm" : "history.record")}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
