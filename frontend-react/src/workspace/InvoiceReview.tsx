/** The step between editing and sending (§8).
 *
 *  Scaffold — see README.md.
 *
 *  The one rule this screen enforces: **Continue is disabled while anything is
 *  blocking.** The blueprint puts it as "the primary CTA should not be
 *  available as if everything were automatically correct", and the inverse —
 *  a live Continue next to a red list — trains people to ignore the list.
 *
 *  Warnings do not disable anything. They are shown, and the user proceeds.
 */

import { Badge, Button, Card, DataList, Divider, type DataListRow } from "@henrioutai/ui";

import { formatDate, formatMoney } from "../lib/format";
import type { Lang } from "../lib/translations";
import { checkReadiness, isReady, type ReadinessItem } from "./readiness";
import { computeTotals } from "./totals";
import type { InvoiceDraft } from "./types";

export interface InvoiceReviewProps {
  draft: InvoiceDraft;
  lang?: Lang;
  invoiceDiscountPercent?: string;
  onBack: () => void;
  onPreviewPdf: () => void;
  onContinue: () => void;
}

function severityBadge(item: ReadinessItem) {
  if (item.severity === "blocking") return <Badge tone="danger">Fix</Badge>;
  if (item.severity === "warning") return <Badge tone="warn">Check</Badge>;
  return <Badge tone="success">OK</Badge>;
}

export function InvoiceReview({
  draft,
  lang = "en",
  invoiceDiscountPercent = "0",
  onBack,
  onPreviewPdf,
  onContinue,
}: InvoiceReviewProps) {
  const totals = computeTotals(draft.lines, invoiceDiscountPercent);
  const readiness = checkReadiness(draft);
  const ready = isReady(readiness);

  const summary: DataListRow[] = [
    { key: "customer", label: "Customer", value: draft.customer?.name ?? "—" },
    {
      key: "vat",
      label: "Customer VAT",
      value: draft.customer?.vatNumber ?? "—",
      mono: true,
    },
    { key: "reference", label: "Invoice number", value: draft.reference ?? "On issue", mono: true },
    {
      key: "issue",
      label: "Issue date",
      value: draft.issueDate ? formatDate(draft.issueDate, lang) : "—",
    },
    {
      key: "due",
      label: "Due date",
      value: draft.dueDate ? formatDate(draft.dueDate, lang) : "—",
    },
    { key: "lines", label: "Items", value: `${draft.lines.length}` },
    {
      key: "subtotal",
      label: "Subtotal",
      value: formatMoney(totals.subtotal, draft.currency, lang),
      mono: true,
    },
    {
      key: "vat_total",
      label: "VAT",
      value: formatMoney(totals.vat, draft.currency, lang),
      mono: true,
    },
  ];

  return (
    <div className="bg-stack">
      <Card title="Review invoice">
        <DataList rows={summary} />
        <Divider />
        <p className="bg-ws-grand">
          <span>Total</span>
          <strong className="bg-num">{formatMoney(totals.total, draft.currency, lang)}</strong>
        </p>
      </Card>

      <Card title="Invoice readiness">
        <ul className="bg-ws-readiness">
          {readiness.map((item) => (
            <li key={item.key} data-severity={item.severity}>
              {severityBadge(item)}
              <span>{item.label}</span>
              {item.detail && <small>{item.detail}</small>}
            </li>
          ))}
        </ul>
      </Card>

      <div className="bg-ws-actions">
        <Button variant="secondary" onClick={onBack}>
          ← Edit invoice
        </Button>
        <Button variant="outline" onClick={onPreviewPdf}>
          Preview PDF
        </Button>
        <Button variant="primary" disabled={!ready} onClick={onContinue}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
