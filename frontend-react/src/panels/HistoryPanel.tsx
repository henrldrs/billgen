/** Invoice history: filter by status, void, issue credit note, record payment.
 *  Corrections follow the Belgian-clean path — the credit-note action is the
 *  primary correction; void exists for pre-send mistakes. */

import { useId, useState, type FormEvent } from "react";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { Modal } from "../components/Modal";
import { Spinner } from "../components/Spinner";
import {
  useDeleteInvoice,
  useInvoices,
  useIssueCreditNote,
  useIssueInvoice,
  useRecordPayment,
  useVoidInvoice,
} from "../hooks/queries";
import { formatDate, formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import { useApi } from "../providers/BillGenProvider";

/** Trigger a browser "Save as" for a fetched document blob. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface HistoryPanelProps {
  companyId: string;
  lang?: Lang;
}

type ActionKind = "void" | "credit_note" | "payment" | "issue" | "delete";

interface PendingAction {
  kind: ActionKind;
  invoiceId: string;
  reference: string;
}

const STATUS_FILTERS = ["", "draft", "issued", "partially_paid", "paid", "voided"] as const;

export function HistoryPanel({ companyId, lang = "en" }: HistoryPanelProps) {
  const filterSelectId = useId();
  const [statusFilter, setStatusFilter] = useState("");
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

  const download = async (kind: "pdf" | "xml", invoiceId: string, reference: string) => {
    const key = `${invoiceId}:${kind}`;
    const safeRef = reference.replace(/\//g, "-");
    setDownloading(key);
    setDownloadFailed(false);
    try {
      if (kind === "pdf") {
        saveBlob(await api.invoicePdf(invoiceId), `${safeRef}.pdf`);
      } else {
        saveBlob(await api.invoicePeppolXml(invoiceId), `${safeRef}.xml`);
      }
    } catch {
      setDownloadFailed(true);
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
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "" ? t(lang, "history.all") : status}
              </option>
            ))}
          </select>
        </div>
      </header>

      {downloadFailed ? (
        <div className="bg-field__error" role="alert">
          {t(lang, "history.downloadError")}
        </div>
      ) : null}

      {invoices && invoices.length > 0 ? (
        <table className="bg-table">
          <thead>
            <tr>
              <th>{t(lang, "history.reference")}</th>
              <th>{t(lang, "history.date")}</th>
              <th>{t(lang, "history.total")}</th>
              <th>{t(lang, "history.status")}</th>
              <th>{t(lang, "history.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  {invoice.reference ?? (
                    <em className="bg-muted">{t(lang, "history.draft")}</em>
                  )}
                </td>
                <td>{formatDate(invoice.issue_date, lang)}</td>
                <td>{formatMoney(invoice.total_ttc, invoice.currency, lang)}</td>
                <td>
                  <span className={`bg-badge bg-badge--${invoice.status}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>
                  {invoice.status === "draft" ? (
                    // A draft has no gapless number: it can be issued (finalized)
                    // or freely deleted. The only export is the watermarked PDF.
                    <>
                      <Button
                        variant="secondary"
                        disabled={downloading === `${invoice.id}:pdf`}
                        onClick={() =>
                          void download("pdf", invoice.id, `draft-${invoice.id}`)
                        }
                      >
                        {t(lang, "history.downloadPdf")}
                      </Button>
                      <Button
                        onClick={() =>
                          setAction({
                            kind: "issue",
                            invoiceId: invoice.id,
                            reference: t(lang, "history.draft"),
                          })
                        }
                      >
                        {t(lang, "history.issue")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          setAction({
                            kind: "delete",
                            invoiceId: invoice.id,
                            reference: t(lang, "history.draft"),
                          })
                        }
                      >
                        {t(lang, "history.delete")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        disabled={downloading === `${invoice.id}:pdf`}
                        onClick={() =>
                          void download("pdf", invoice.id, invoice.reference ?? invoice.id)
                        }
                      >
                        {t(lang, "history.downloadPdf")}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={downloading === `${invoice.id}:xml`}
                        onClick={() =>
                          void download("xml", invoice.id, invoice.reference ?? invoice.id)
                        }
                      >
                        {t(lang, "history.downloadXml")}
                      </Button>
                      {invoice.status !== "voided" ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setAction({
                                kind: "payment",
                                invoiceId: invoice.id,
                                reference: invoice.reference ?? invoice.id,
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
                                invoiceId: invoice.id,
                                reference: invoice.reference ?? invoice.id,
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
                                invoiceId: invoice.id,
                                reference: invoice.reference ?? invoice.id,
                              })
                            }
                          >
                            {t(lang, "history.void")}
                          </Button>
                        </>
                      ) : null}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState message={t(lang, "history.empty")} />
      )}

      <Modal
        open={action !== null}
        title={action ? `${t(lang, `history.${action.kind === "credit_note" ? "creditNote" : action.kind}` as never)} — ${action.reference}` : ""}
        onClose={closeAction}
      >
        <form onSubmit={handleActionSubmit}>
          {action?.kind === "payment" ? (
            <>
              <Field
                label={t(lang, "history.paymentAmount")}
                value={amount}
                required
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
              />
              <Field
                label={t(lang, "history.paymentDate")}
                value={paidOn}
                required
                type="date"
                onChange={(event) => setPaidOn(event.target.value)}
              />
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
              value={reason}
              required
              onChange={(event) => setReason(event.target.value)}
            />
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
