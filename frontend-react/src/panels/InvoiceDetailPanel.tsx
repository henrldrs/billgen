/** Invoice detail — one invoice, everything the server knows about it.
 *
 *  This screen existed as a scaffold page listing four endpoints it "could
 *  already use". All four were real the whole time:
 *
 *    GET /invoices/{id}          header, lines, frozen totals
 *    GET /payments?invoice_id    what has been received against it
 *    GET /activity?target_id     the lifecycle, from the audit log
 *    GET /invoices/{id}/pdf|peppol.xml, POST issue|void|payments|credit-notes
 *
 *  The IA declared the timeline blocked on "GET /activity?target_id" — that
 *  parameter has since shipped (api/routers/activity.py) and every invoice
 *  event is written with target_type="invoice" and target_id=<invoice id>,
 *  including payments (core/services/payment_service.py). So the timeline is
 *  real audit data, not a three-step fiction reconstructed from status.
 *
 *  Still not real, and still stated as such on the page: send and duplicate.
 *
 *  No arithmetic. subtotal/discount/VAT/total are printed exactly as the
 *  server froze them at issue time, and per-line amounts are NOT shown at all
 *  because InvoiceLineOut carries no line total — inventing one by multiplying
 *  quantity by unit price would put invoice maths in a React component.
 */

import { useState, type FormEvent, type ReactNode } from "react";

import {
  Badge,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  CopyButton,
  DataList,
  DatePicker,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  RecordLayout,
  Select,
  Skeleton,
  StatusTimeline,
  Table,
  TextInput,
  Textarea,
  type TableColumn,
  type TimelineItem,
} from "@henrioutai/ui";

import {
  useActivity,
  useClient,
  useDeleteInvoice,
  useInvoice,
  useIssueCreditNote,
  useIssueInvoice,
  usePayments,
  useRecordPayment,
  useVoidInvoice,
} from "../hooks/queries";
import { ApiError } from "../lib/apiClient";
import { documentFilename, saveBlob } from "../lib/download";
import { formatDate, formatMoney } from "../lib/format";
import { t, tAuditAction, tPeppolError, type Lang } from "../lib/translations";
import { useApi } from "../providers/BillGenProvider";
import { findByPath } from "../scaffold/ia";
import { ScaffoldBlock, ScaffoldButton, ScaffoldNote } from "../scaffold/Scaffold";
import type { InvoiceLineOut, PaymentResponse } from "../types";

/** The five payment methods the API accepts (core/models/payment.py). Sent
 *  verbatim — an unknown value is a 422, so this list is not decoration. */
const PAYMENT_METHODS = [
  "bank_transfer",
  "card",
  "cash",
  "check",
  "other",
] as const;

type ActionKind = "issue" | "delete" | "void" | "credit_note" | "payment";

export interface InvoiceDetailPanelProps {
  invoiceId: string;
  lang?: Lang;
  /** Back to the invoice list. */
  onBack?: () => void;
  /** Open the client's 360 screen. */
  onOpenClient?: (clientId: string) => void;
  /** Called after the draft this screen shows has been deleted. */
  onDeleted?: () => void;
}

export function InvoiceDetailPanel({
  invoiceId,
  lang = "en",
  onBack,
  onOpenClient,
  onDeleted,
}: InvoiceDetailPanelProps) {
  const api = useApi();
  const invoice = useInvoice(invoiceId);
  const payments = usePayments(invoiceId);
  const history = useActivity({ targetId: invoiceId, limit: 50 });
  const client = useClient(invoice.data?.client_id);

  const issueInvoice = useIssueInvoice();
  const deleteInvoice = useDeleteInvoice();
  const voidInvoice = useVoidInvoice();
  const issueCreditNote = useIssueCreditNote();
  const recordPayment = useRecordPayment();

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [savedFile, setSavedFile] = useState<string | null>(null);
  const [peppolErrors, setPeppolErrors] = useState<string[]>([]);

  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState<string | null>(null);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [paymentRef, setPaymentRef] = useState("");
  const [notes, setNotes] = useState("");

  if (invoice.isLoading) return <DetailSkeleton />;

  if (invoice.isError || !invoice.data) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          description={t(lang, "invoiceDetail.notFound")}
          onRetry={() => void invoice.refetch()}
          retryLabel={t(lang, "common.retry")}
        />
        {onBack ? (
          <div className="bg-panel__actions">
            <Button variant="secondary" onClick={onBack}>
              {t(lang, "invoiceDetail.backToInvoices")}
            </Button>
          </div>
        ) : null}
      </Card>
    );
  }

  const record = invoice.data;
  const title = record.reference ?? t(lang, "history.draft");
  const isDraft = record.status === "draft";
  const isVoided = record.status === "voided";
  // A draft has no gapless number, so it can neither be exported to Peppol nor
  // corrected by a credit note — both are operations on an issued document.
  const isFinal = !isDraft && !isVoided;

  const download = async (kind: "pdf" | "xml") => {
    const filename = documentFilename(record.reference ?? `draft-${record.id}`, kind);
    setDownloading(kind);
    setDownloadFailed(false);
    setSavedFile(null);
    setPeppolErrors([]);
    try {
      const blob =
        kind === "pdf"
          ? await api.invoicePdf(record.id)
          : await api.invoicePeppolXml(record.id);
      if (await saveBlob(blob, filename)) setSavedFile(filename);
    } catch (err) {
      if (err instanceof ApiError && err.errors.length > 0) {
        setPeppolErrors(err.errors.map((error) => error.message_key));
      } else {
        setDownloadFailed(true);
      }
      return;
    } finally {
      setDownloading(null);
    }
    // An export writes an audit entry server-side, so the timeline is stale.
    void history.refetch();
  };

  const closeAction = () => {
    setAction(null);
    setReason("");
    setAmount("");
    setPaidOn(null);
    setMethod(PAYMENT_METHODS[0]);
    setPaymentRef("");
    setNotes("");
  };

  const submitAction = (event: FormEvent) => {
    event.preventDefault();
    if (action === "void") {
      voidInvoice.mutate({ invoiceId: record.id, reason }, { onSuccess: closeAction });
    } else if (action === "credit_note") {
      issueCreditNote.mutate(
        { invoice_id: record.id, reason },
        { onSuccess: closeAction },
      );
    } else if (action === "payment" && paidOn) {
      recordPayment.mutate(
        {
          invoice_id: record.id,
          amount,
          paid_on: paidOn,
          method,
          reference: paymentRef || null,
          notes: notes || null,
        },
        { onSuccess: closeAction },
      );
    }
  };

  const actionPending =
    issueInvoice.isPending ||
    deleteInvoice.isPending ||
    voidInvoice.isPending ||
    issueCreditNote.isPending ||
    recordPayment.isPending;
  const actionFailed =
    voidInvoice.isError || issueCreditNote.isError || recordPayment.isError;

  return (
    <section className="bg-stack" aria-label={title}>
      <PageHeader
        title={title}
        subtitle={client.data?.name ?? undefined}
        onBack={onBack}
        actions={
          <Button disabled={downloading === "pdf"} onClick={() => void download("pdf")}>
            {t(lang, "history.downloadPdf")}
          </Button>
        }
      />

      {downloadFailed ? (
        <Banner tone="danger" onDismiss={() => setDownloadFailed(false)}>
          {t(lang, "history.downloadError")}
        </Banner>
      ) : null}

      {peppolErrors.length > 0 ? (
        <Banner
          tone="warn"
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

      {savedFile ? (
        <Banner tone="success" onDismiss={() => setSavedFile(null)}>
          {t(lang, "history.downloadSaved")} {savedFile}
        </Banner>
      ) : null}

      {isVoided && record.voided_reason ? (
        <Banner tone="danger" title={t(lang, "invoiceDetail.voidedReason")}>
          {record.voided_reason}
        </Banner>
      ) : null}

      <RecordLayout
        left={
          <SummaryRail
            record={record}
            clientName={client.data?.name}
            lang={lang}
            onOpenClient={onOpenClient}
          />
        }
        right={
          <ContextRail
            history={history}
            lang={lang}
            invoiceId={invoiceId}
            actions={
              <ActionsCard
                lang={lang}
                isDraft={isDraft}
                isFinal={isFinal}
                downloading={downloading}
                pending={actionPending}
                onDownloadXml={() => void download("xml")}
                onIssue={() => setAction("issue")}
                onDelete={() => setAction("delete")}
                onVoid={() => setAction("void")}
                onCreditNote={() => setAction("credit_note")}
                onPayment={() => setAction("payment")}
              />
            }
          />
        }
      >
        <LinesCard lines={record.lines} lang={lang} />
        <TotalsCard record={record} lang={lang} />
        <PaymentsCard query={payments} lang={lang} />
      </RecordLayout>

      {/* Confirm-only actions have no fields, so they are a ConfirmDialog and
          not a form with one paragraph in it. */}
      <ConfirmDialog
        open={action === "issue"}
        title={`${t(lang, "history.issue")} — ${title}`}
        confirmLabel={t(lang, "history.confirm")}
        cancelLabel={t(lang, "common.cancel")}
        onCancel={closeAction}
        onConfirm={() => issueInvoice.mutate(record.id, { onSuccess: closeAction })}
      >
        {t(lang, "history.issueConfirm")}
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "delete"}
        title={`${t(lang, "history.delete")} — ${title}`}
        confirmLabel={t(lang, "history.confirm")}
        cancelLabel={t(lang, "common.cancel")}
        danger
        onCancel={closeAction}
        onConfirm={() =>
          deleteInvoice.mutate(record.id, {
            onSuccess: () => {
              closeAction();
              // The record this screen is addressed by no longer exists; staying
              // here would render an error page for a successful action.
              (onDeleted ?? onBack)?.();
            },
          })
        }
      >
        {t(lang, "history.deleteConfirm")}
      </ConfirmDialog>

      <Modal
        open={action === "void" || action === "credit_note" || action === "payment"}
        title={
          action === "payment"
            ? `${t(lang, "history.payment")} — ${title}`
            : action === "credit_note"
              ? `${t(lang, "history.creditNote")} — ${title}`
              : `${t(lang, "history.void")} — ${title}`
        }
        onClose={closeAction}
      >
        <form onSubmit={submitAction}>
          {action === "payment" ? (
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
              <Field label={t(lang, "invoiceDetail.method")}>
                <Select
                  value={method}
                  options={PAYMENT_METHODS.map((value) => ({ value, label: value }))}
                  onChange={(event) => setMethod(event.target.value)}
                />
              </Field>
              <Field label={t(lang, "history.reference")}>
                <TextInput
                  value={paymentRef}
                  onChange={(event) => setPaymentRef(event.target.value)}
                />
              </Field>
              <Field label={t(lang, "invoice.comments")}>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
            </>
          ) : (
            <Field
              label={t(
                lang,
                action === "void" ? "history.voidReason" : "history.creditNoteReason",
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

          {actionFailed ? (
            <Banner tone="danger">{t(lang, "common.error")}</Banner>
          ) : null}

          <div className="bg-panel__actions">
            <Button variant="secondary" onClick={closeAction}>
              {t(lang, "common.cancel")}
            </Button>
            <Button
              type="submit"
              variant={action === "void" ? "danger" : "primary"}
              // The date picker returns null until a day is chosen, and the
              // API requires paid_on — required on a native input cannot see
              // a controlled null.
              disabled={actionPending || (action === "payment" && !paidOn)}
            >
              {t(lang, "history.record")}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

// ---------------------------------------------------------------- left: summary

function SummaryRail({
  record,
  clientName,
  lang,
  onOpenClient,
}: {
  record: NonNullable<ReturnType<typeof useInvoice>["data"]>;
  clientName: string | undefined;
  lang: Lang;
  onOpenClient?: (clientId: string) => void;
}) {
  return (
    <Card title={t(lang, "invoiceDetail.summary")}>
      <DataList
        rows={[
          {
            key: "status",
            label: t(lang, "history.status"),
            value:
              record.status === "overdue" ? (
                <Badge tone="warn">{record.status}</Badge>
              ) : (
                <Badge status={record.status as "draft" | "issued" | "paid"} />
              ),
          },
          {
            key: "reference",
            label: t(lang, "history.reference"),
            mono: true,
            value: record.reference ? (
              <>
                {record.reference}{" "}
                <CopyButton
                  value={record.reference}
                  label={t(lang, "history.reference")}
                />
              </>
            ) : null,
          },
          {
            key: "client",
            label: t(lang, "invoice.client"),
            value:
              clientName && onOpenClient ? (
                <button
                  type="button"
                  className="bg-linkish"
                  onClick={() => onOpenClient(record.client_id)}
                >
                  {clientName}
                </button>
              ) : (
                clientName
              ),
          },
          {
            key: "issue_date",
            label: t(lang, "history.date"),
            value: formatDate(record.issue_date, lang),
          },
          {
            key: "due_date",
            label: t(lang, "reports.dueDate"),
            value: record.due_date ? formatDate(record.due_date, lang) : null,
          },
          {
            key: "terms",
            label: t(lang, "invoiceDetail.paymentTerms"),
            value: record.payment_terms,
          },
          {
            key: "template",
            label: t(lang, "invoiceDetail.template"),
            value: record.pdf_template,
            mono: true,
          },
          {
            key: "comments",
            label: t(lang, "invoice.comments"),
            value: record.comments,
          },
        ]}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- centre: body

function LinesCard({ lines, lang }: { lines: InvoiceLineOut[]; lang: Lang }) {
  const columns: TableColumn<InvoiceLineOut>[] = [
    { key: "description", label: t(lang, "invoice.description") },
    {
      key: "quantity",
      label: t(lang, "invoice.quantity"),
      numeric: true,
      render: (line) => <span className="bg-num">{line.quantity}</span>,
    },
    {
      key: "unit_price",
      label: t(lang, "invoice.unitPrice"),
      numeric: true,
      render: (line) => <span className="bg-num">{line.unit_price}</span>,
    },
    {
      key: "vat",
      label: t(lang, "invoice.vatRate"),
      numeric: true,
      render: (line) => <span className="bg-num">{line.vat.rate}</span>,
    },
    {
      key: "discount",
      label: t(lang, "invoice.discount"),
      render: (line) =>
        line.discount ? `${line.discount.value} (${line.discount.type})` : "—",
    },
  ];
  return (
    <Card padded={false} title={t(lang, "invoiceDetail.lines")}>
      <Table
        columns={columns}
        rows={lines}
        rowKey={(line) => String(line.line_number)}
        empty={<EmptyState title={t(lang, "history.empty")} />}
      />
    </Card>
  );
}

/** The four frozen totals. Printed, never recomputed — the server sealed these
 *  when the invoice was issued and a legal document does not get re-derived by
 *  whichever client happens to be rendering it. */
function TotalsCard({
  record,
  lang,
}: {
  record: NonNullable<ReturnType<typeof useInvoice>["data"]>;
  lang: Lang;
}) {
  return (
    <Card>
      <DataList
        layout="inline"
        rows={[
          {
            key: "subtotal",
            label: t(lang, "invoice.subtotal"),
            value: formatMoney(record.subtotal_ht, record.currency, lang),
            mono: true,
          },
          {
            key: "discount",
            label: t(lang, "invoice.discount"),
            value: formatMoney(record.total_discount, record.currency, lang),
            mono: true,
          },
          {
            key: "vat",
            label: t(lang, "invoice.vat"),
            value: formatMoney(record.total_vat, record.currency, lang),
            mono: true,
          },
          {
            key: "total",
            label: t(lang, "invoice.total"),
            value: formatMoney(record.total_ttc, record.currency, lang),
            mono: true,
          },
        ]}
      />
    </Card>
  );
}

function PaymentsCard({
  query,
  lang,
}: {
  query: ReturnType<typeof usePayments>;
  lang: Lang;
}) {
  const columns: TableColumn<PaymentResponse>[] = [
    {
      key: "paid_on",
      label: t(lang, "history.paymentDate"),
      render: (row) => formatDate(row.paid_on, lang),
    },
    {
      key: "method",
      label: t(lang, "invoiceDetail.method"),
      render: (row) => <Badge tone="neutral">{row.method}</Badge>,
    },
    {
      key: "reference",
      label: t(lang, "history.reference"),
      render: (row) => row.reference || "—",
    },
    {
      key: "amount",
      label: t(lang, "history.paymentAmount"),
      numeric: true,
      render: (row) => formatMoney(row.amount, row.currency, lang),
    },
  ];

  return (
    <Card padded={false} title={t(lang, "invoiceDetail.payments")}>
      {query.isLoading ? (
        <div className="bg-report__skeleton">
          <Skeleton lines={3} />
        </div>
      ) : query.isError ? (
        <div className="bg-report__skeleton" role="alert">
          {t(lang, "common.error")}
        </div>
      ) : (
        <Table
          columns={columns}
          rows={query.data ?? []}
          rowKey={(row) => row.id}
          empty={<EmptyState title={t(lang, "invoiceDetail.noPayments")} />}
        />
      )}
    </Card>
  );
}

// --------------------------------------------------------------- right: context

function ActionsCard({
  lang,
  isDraft,
  isFinal,
  downloading,
  pending,
  onDownloadXml,
  onIssue,
  onDelete,
  onVoid,
  onCreditNote,
  onPayment,
}: {
  lang: Lang;
  isDraft: boolean;
  isFinal: boolean;
  downloading: string | null;
  pending: boolean;
  onDownloadXml: () => void;
  onIssue: () => void;
  onDelete: () => void;
  onVoid: () => void;
  onCreditNote: () => void;
  onPayment: () => void;
}) {
  const detail = findByPath("sales/invoices/id/:invoiceId");
  return (
    <Card title={t(lang, "history.actions")}>
      <div className="bg-record__actions">
        {isDraft ? (
          <>
            <Button disabled={pending} onClick={onIssue}>
              {t(lang, "history.issue")}
            </Button>
            <Button variant="danger" disabled={pending} onClick={onDelete}>
              {t(lang, "history.delete")}
            </Button>
          </>
        ) : null}

        {isFinal ? (
          <>
            <Button variant="secondary" disabled={pending} onClick={onPayment}>
              {t(lang, "history.payment")}
            </Button>
            <Button
              variant="secondary"
              disabled={downloading === "xml"}
              onClick={onDownloadXml}
            >
              {t(lang, "history.downloadXml")}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={onCreditNote}>
              {t(lang, "history.creditNote")}
            </Button>
            <Button variant="danger" disabled={pending} onClick={onVoid}>
              {t(lang, "history.void")}
            </Button>
          </>
        ) : null}
      </div>

      {detail ? (
        <>
          <Divider />
          {/* The two actions that are still fiction stay in the scaffold kit
              rather than becoming disabled real buttons — a greyed-out Send
              reads as "not yet allowed", not as "does not exist". */}
          <ScaffoldBlock
            node={detail}
            title="Delivery"
            missing={[
              "POST /invoices/{id}/send",
              "POST /invoices/{id}/duplicate",
              "email transport",
            ]}
          >
            <ScaffoldNote>
              Sending needs an email transport, and InvoiceStatus has no SENT or
              VIEWED member — the domain has no concept of delivery, so there is
              nothing for a Send button to change.
            </ScaffoldNote>
            <ScaffoldButton wouldDo="email this invoice to the client">Send</ScaffoldButton>
            <ScaffoldButton wouldDo="copy this invoice into a new draft">
              Duplicate
            </ScaffoldButton>
          </ScaffoldBlock>
        </>
      ) : null}
    </Card>
  );
}

function ContextRail({
  history,
  lang,
  invoiceId,
  actions,
}: {
  history: ReturnType<typeof useActivity>;
  lang: Lang;
  invoiceId: string;
  actions: ReactNode;
}) {
  const returned = history.data ?? [];

  // Same defence as Client 360: FastAPI silently DISCARDS query parameters it
  // does not declare, so an API older than this build answers ?target_id=… with
  // the whole organisation's audit log and this card would render it as this
  // invoice's lifecycle. Dropping non-matching rows makes that visible.
  const entries = returned.filter((entry) => entry.target_id === invoiceId);
  const serverIgnoredFilter = returned.length > entries.length;

  const items: TimelineItem[] = [...entries]
    // The API returns newest first; a lifecycle reads oldest first.
    .reverse()
    .map((entry, index) => ({
      key: entry.id,
      label: tAuditAction(lang, entry.action),
      timestamp: new Date(entry.timestamp).toLocaleString(),
      status: index === entries.length - 1 ? "current" : "done",
    }));

  return (
    <>
      {actions}
      <Card title={t(lang, "invoiceDetail.history")}>
        <p className="bg-record__hint">{t(lang, "invoiceDetail.historyHint")}</p>
        {history.isLoading ? (
          <Skeleton lines={4} />
        ) : history.isError ? (
          <div role="alert">{t(lang, "common.error")}</div>
        ) : serverIgnoredFilter ? (
          <Banner tone="warn">{t(lang, "client360.staleFilter")}</Banner>
        ) : items.length > 0 ? (
          <StatusTimeline items={items} />
        ) : (
          <EmptyState title={t(lang, "invoiceDetail.noHistory")} />
        )}
      </Card>
    </>
  );
}

// -------------------------------------------------------------------- loading

function DetailSkeleton() {
  return (
    <div className="bg-record bg-record--three" aria-busy="true">
      <div className="bg-record__rail bg-record__rail--left">
        <Skeleton variant="block" height="18rem" />
      </div>
      <div className="bg-record__main">
        <Skeleton variant="block" height="14rem" />
      </div>
      <div className="bg-record__rail bg-record__rail--right">
        <Skeleton variant="block" height="12rem" />
      </div>
    </div>
  );
}
