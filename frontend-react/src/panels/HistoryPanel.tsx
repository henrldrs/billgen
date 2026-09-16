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
  Skeleton,
  Table,
  Textarea,
  TextInput,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";
import {
  useClient,
  useClients,
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
import { daysOverdue } from "../lib/invoiceStatus";
import { statusLabel, t, tPeppolError, tf, type Lang } from "../lib/translations";
import { InvoiceDocument } from "./InvoiceDocument";
import { useApi } from "../providers/BillGenProvider";
import type { InvoiceResponse } from "../types";

export interface HistoryPanelProps {
  companyId: string;
  lang?: Lang;
  /**
   * Lock the list to one invoice status. Supplied by the /sales/invoices/:status
   * routes, where the tab IS the filter. The panel used to carry a Status
   * select of its own for the unfiltered route, which put two controls for the
   * same thing on one screen (T-45); the tabs are the only filter now. Mount
   * with a `key` of the status so switching tabs remounts with the new seed.
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

const PAGE_SIZE = 25;

export function HistoryPanel({
  companyId,
  lang = "en",
  status,
  onOpenInvoice,
}: HistoryPanelProps) {
  const { data: invoices, isLoading, isError } = useInvoices({ companyId, status });

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

  // Who owes: the list carries client ids, and a receivables list that cannot
  // be read for its debtor cannot be read for the one thing it is for. One
  // company-wide fetch and an index, the same shape ReceivablesPanel uses.
  const { data: clients } = useClients(companyId);
  const clientName = useMemo(() => {
    const index = new Map<string, string>();
    for (const client of clients ?? []) index.set(client.id, client.name);
    return (id: string) => index.get(id) ?? "—";
  }, [clients]);

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
        case "client":
          return clientName(row.client_id);
        case "due_date":
          // A draft may have no due date; it sorts last rather than first.
          return row.due_date ?? "9999-12-31";
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
  }, [invoices, sort, clientName]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reference · Client · Date · Due · Total · Status. Three drafts that all
  // read "Draft" and differ only by amount was the old row (T-45); now the
  // reference cell says what a draft lacks, and the debtor and the deadline
  // are on the row because they are what a receivables list is read for.
  const columns: TableColumn<InvoiceResponse>[] = [
    {
      key: "reference",
      label: t(lang, "history.reference"),
      sortable: true,
      render: (invoice) =>
        invoice.reference ? (
          <span className="bg-num">{invoice.reference}</span>
        ) : (
          <span className="bg-muted">{t(lang, "history.noNumber")}</span>
        ),
    },
    {
      key: "client",
      label: t(lang, "invoice.client"),
      sortable: true,
      render: (invoice) => clientName(invoice.client_id),
    },
    {
      key: "issue_date",
      label: t(lang, "history.date"),
      sortable: true,
      render: (invoice) => formatDate(invoice.issue_date, lang),
    },
    {
      key: "due_date",
      label: t(lang, "reports.dueDate"),
      sortable: true,
      render: (invoice) => (invoice.due_date ? formatDate(invoice.due_date, lang) : "—"),
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
      // Overdue is derived from the calendar, the way the server's reports
      // derive it, and carries its age: "Issued" on a receivable 43 days late
      // was the defect. It is the one state Badge has no colour for, so a warn
      // tone rather than an invented modifier class.
      render: (invoice) => {
        const late = daysOverdue(invoice);
        if (late !== null) {
          return (
            <Badge tone="warn">
              {late === 1
                ? t(lang, "history.overdueDay")
                : tf(lang, "history.overdueDays", { days: late })}
            </Badge>
          );
        }
        if (invoice.status === "overdue") {
          // A row that says so without a date to count from — a restored
          // backup could — still reads as what it is rather than as nothing.
          return <Badge tone="warn">{t(lang, "history.overdue")}</Badge>;
        }
        return <Badge status={invoice.status as never}>{statusLabel(lang, invoice.status)}</Badge>;
      },
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
      {/* The route renders the PageHeader and the status tabs; the panel owns
          the list and the sheet, nothing above them. */}
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
