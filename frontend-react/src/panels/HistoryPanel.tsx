/** Invoice history: filter by status, void, issue credit note, record payment.
 *  Corrections follow the Belgian-clean path — the credit-note action is the
 *  primary correction; void exists for pre-send mistakes. */

import { useId, useState, type FormEvent } from "react";

import {
  Badge,
  Button,
  CopyButton,
  Divider,
  Drawer,
  EmptyState,
  Field,
  Modal,
  Spinner,
  Table,
  TextInput,
  type TableColumn,
} from "@henrioutai/ui";
import {
  useDeleteInvoice,
  useInvoices,
  useIssueCreditNote,
  useIssueInvoice,
  useRecordPayment,
  useVoidInvoice,
} from "../hooks/queries";
import { ApiError } from "../lib/apiClient";
import { formatDate, formatMoney } from "../lib/format";
import { t, tPeppolError, type Lang } from "../lib/translations";
import { useApi } from "../providers/BillGenProvider";
import type { InvoiceResponse } from "../types";

/** Minimal typing for the File System Access API save dialog. */
type SaveFilePicker = (options: {
  suggestedName?: string;
}) => Promise<{
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
}>;

/** Trigger a browser "Save as" for a fetched document blob (no dialog). */
function saveBlobViaAnchor(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Save a document blob, letting the user pick the destination when the
 *  browser supports it (Chromium/WebView2); otherwise fall back to the
 *  classic downloads-folder anchor. Returns false when the user cancelled. */
async function saveBlob(blob: Blob, filename: string): Promise<boolean> {
  const picker = (window as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return false;
      // Picker unavailable in this context (e.g. sandboxed iframe) — fall back.
    }
  }
  saveBlobViaAnchor(blob, filename);
  return true;
}

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
}

type ActionKind = "void" | "credit_note" | "payment" | "issue" | "delete";

interface PendingAction {
  kind: ActionKind;
  invoiceId: string;
  reference: string;
}

const STATUS_FILTERS = ["", "draft", "issued", "partially_paid", "paid", "voided"] as const;

export function HistoryPanel({ companyId, lang = "en", status }: HistoryPanelProps) {
  const filterSelectId = useId();
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
    const filename = `${reference.replace(/\//g, "-")}.${kind}`;
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
  const [paidOn, setPaidOn] = useState("");

  const closeAction = () => {
    setAction(null);
    setReason("");
    setAmount("");
    setPaidOn("");
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
    } else {
      recordPayment.mutate(
        { invoice_id: action.invoiceId, amount, paid_on: paidOn },
        { onSuccess: closeAction },
      );
    }
  };

  // The drawer is addressed by id rather than by holding the invoice object, so
  // it re-reads from the refreshed list after a mutation instead of showing a
  // stale copy of the row that was clicked.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = invoices?.find((invoice) => invoice.id === selectedId);

  const columns: TableColumn<InvoiceResponse>[] = [
    {
      key: "reference",
      label: t(lang, "history.reference"),
      render: (invoice) => (
        <span className="bg-num">{invoice.reference ?? t(lang, "history.draft")}</span>
      ),
    },
    {
      key: "issue_date",
      label: t(lang, "history.date"),
      render: (invoice) => formatDate(invoice.issue_date, lang),
    },
    {
      key: "total_ttc",
      label: t(lang, "history.total"),
      numeric: true,
      render: (invoice) => formatMoney(invoice.total_ttc, invoice.currency, lang),
    },
    {
      key: "status",
      label: t(lang, "history.status"),
      render: (invoice) => <Badge status={invoice.status as never} />,
    },
  ];

  if (isLoading) return <Spinner label={t(lang, "common.loading")} />;
  if (isError) return <div role="alert">{t(lang, "common.error")}</div>;

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
    <section className="bg-panel" aria-label={t(lang, "history.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "history.title")}</h1>
        {routeFiltered ? null : (
          <div className="bg-field">
            <label className="bg-field__label" htmlFor={filterSelectId}>
              {t(lang, "history.status")}
            </label>
            <select
              id={filterSelectId}
              className="bg-field__input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === "" ? t(lang, "history.all") : option}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {downloadFailed ? (
        <div className="bg-field__error" role="alert">
          {t(lang, "history.downloadError")}
        </div>
      ) : null}

      {peppolErrors.length > 0 ? (
        <div className="bg-field__error" role="alert">
          <p>{t(lang, "history.peppolBlocked")}</p>
          <ul>
            {peppolErrors.map((key) => (
              <li key={key}>{tPeppolError(lang, key)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {downloadedFile ? (
        <div className="bg-download-confirm" role="status">
          {t(lang, "history.downloadSaved")} {downloadedFile}
        </div>
      ) : null}

      <Table
        columns={columns}
        rows={invoices ?? []}
        rowKey={(invoice) => invoice.id}
        onRowClick={(invoice) => setSelectedId(invoice.id)}
        empty={<EmptyState title={t(lang, "history.empty")} />}
      />

      {/* N3 — the record inspector. Every action except the single most common
          one (download PDF) lives here rather than in the row: a row that ends
          in five equal-weight buttons makes none of them readable, and Menu
          cannot be used inside Table because .bg-table-wrap clips it. */}
      <Drawer
        open={selected !== undefined}
        onClose={() => setSelectedId(null)}
        title={selected ? (selected.reference ?? t(lang, "history.draft")) : ""}
        size="lg"
        footer={
          selected ? (
            <>
              <Button
                variant="secondary"
                disabled={downloading === `${selected.id}:pdf`}
                onClick={() =>
                  void download("pdf", selected.id, selected.reference ?? `draft-${selected.id}`)
                }
              >
                {t(lang, "history.downloadPdf")}
              </Button>
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
          <>
            <dl className="bg-totals">
              <dt>{t(lang, "history.status")}</dt>
              <dd><Badge status={selected.status as never} /></dd>
              <dt>{t(lang, "history.date")}</dt>
              <dd>{formatDate(selected.issue_date, lang)}</dd>
              <dt>{t(lang, "history.total")}</dt>
              <dd>{formatMoney(selected.total_ttc, selected.currency, lang)}</dd>
            </dl>

            {selected.reference ? (
              <p>
                <span className="bg-num">{selected.reference}</span>{" "}
                <CopyButton value={selected.reference} label={t(lang, "history.reference")} />
              </p>
            ) : null}

            <Divider />

            {/* Issued invoices only: a draft has no gapless number, so it can
                neither be exported to Peppol nor corrected by a credit note. */}
            {selected.status !== "draft" && selected.status !== "voided" ? (
              <div className="bg-panel__actions">
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
              </div>
            ) : null}
          </>
        ) : null}
      </Drawer>

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
                <TextInput
                  value={paidOn}
                  required
                  type="date"
                  onChange={(event) => setPaidOn(event.target.value)}
                />
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
              <TextInput
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
              disabled={actionPending}
            >
              {t(lang, isConfirmOnly ? "history.confirm" : "history.record")}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
