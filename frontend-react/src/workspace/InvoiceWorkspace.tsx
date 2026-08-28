/** The invoice workspace (§1) — four steps, one live document.
 *
 *  Scaffold — see README.md. Every piece of data arrives as a prop and every
 *  mutation leaves as a callback; this component fetches nothing, which is
 *  what makes it testable without a server and un-integrated by construction.
 *
 *  Two deliberate shapes:
 *
 *  **Full-screen, not a modal.** A modal implies a task short enough to hold
 *  in your head. Composing an invoice is not, and a modal that traps a
 *  half-finished draft behind a backdrop is how drafts get abandoned.
 *
 *  **The stepper does not gate.** Steps are navigation, not a wizard: Continue
 *  is never disabled, and the readiness check is what refuses — once, in one
 *  place, with reasons. Gating each step instead would put the same rules in
 *  four places and let a user pass all four and still be unable to issue.
 *
 *  Note what `Stepper` does and does not give us: `onStepClick` makes
 *  *completed* steps clickable, so it handles going back and cannot handle
 *  going forward. The explicit Back/Continue pair below is therefore not
 *  redundant with it — without them the workspace is stuck on step one, which
 *  is exactly what happened the first time this was rendered.
 */

import { useMemo, useState } from "react";
import { Button, PageHeader, Stepper, type StepItem } from "@henrioutai/ui";

import type { Lang } from "../lib/translations";
import { CreateCustomerDrawer } from "./CreateCustomerDrawer";
import { DeliveryPanel } from "./DeliveryPanel";
import { EditItemDrawer, type VatRateOption } from "./EditItemDrawer";
import { InvoiceCustomerPicker, type CustomerOption } from "./InvoiceCustomerPicker";
import { InvoiceDetailsPanel } from "./InvoiceDetailsPanel";
import { InvoiceItemsEditor, type CatalogItem } from "./InvoiceItemsEditor";
import { InvoiceReview } from "./InvoiceReview";
import { InvoiceTotals } from "./InvoiceTotals";
import { LiveInvoicePreview, type PreviewCompany } from "./LiveInvoicePreview";
import { computeTotals } from "./totals";
import type { InvoiceTemplate } from "./templateSchema";
import { WORKSPACE_STEPS, type DraftCustomer, type InvoiceDraft, type WorkspaceStep } from "./types";

export interface InvoiceWorkspaceProps {
  draft: InvoiceDraft;
  onDraftChange: (draft: InvoiceDraft) => void;

  company: PreviewCompany;
  template: InvoiceTemplate;
  customers: CustomerOption[];
  customersLoading?: boolean;
  catalog: CatalogItem[];
  /** From `GET /vat-rates`. The composer keeps no list of its own. */
  vatRates: VatRateOption[];

  lang?: Lang;
  saving?: boolean;

  onSaveDraft: () => void;
  onCreateCustomer: (customer: DraftCustomer) => void;
  onPreviewPdf: () => void;
  onIssue: () => void;
  onExit: () => void;
}

const STEP_LABELS: Record<WorkspaceStep, string> = {
  customer: "Customer",
  items: "Items",
  details: "Details",
  review: "Review",
};

export function InvoiceWorkspace({
  draft,
  onDraftChange,
  company,
  template,
  customers,
  customersLoading = false,
  catalog,
  vatRates,
  lang = "en",
  saving = false,
  onSaveDraft,
  onCreateCustomer,
  onPreviewPdf,
  onIssue,
  onExit,
}: InvoiceWorkspaceProps) {
  const [step, setStep] = useState<WorkspaceStep>("customer");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);

  const stepIndex = WORKSPACE_STEPS.indexOf(step);
  const totals = useMemo(() => computeTotals(draft.lines), [draft.lines]);
  const editingLine = draft.lines.find((line) => line.key === editingLineKey) ?? null;

  const steps: StepItem[] = WORKSPACE_STEPS.map((key) => ({
    key,
    label: STEP_LABELS[key],
  }));

  return (
    <div className="bg-ws">
      <PageHeader
        title={draft.reference ? `Invoice ${draft.reference}` : "New invoice · Draft"}
        actions={
          <>
            <Button variant="ghost" onClick={onExit}>
              ← Invoices
            </Button>
            <Button variant="secondary" onClick={onSaveDraft} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={onPreviewPdf}>
              Preview
            </Button>
          </>
        }
      />

      <Stepper steps={steps} activeKey={step} onStepClick={(key) => setStep(key as WorkspaceStep)} />

      <div className="bg-ws__split">
        <div className="bg-ws__form bg-stack">
          {step === "customer" && (
            <InvoiceCustomerPicker
              customers={customers}
              loading={customersLoading}
              selected={draft.customer}
              onSelect={(customer) => onDraftChange({ ...draft, customer })}
              onCreateRequested={() => setCreatingCustomer(true)}
            />
          )}

          {step === "items" && (
            <>
              <InvoiceItemsEditor
                lines={draft.lines}
                currency={draft.currency}
                lang={lang}
                catalog={catalog}
                onChange={(lines) => onDraftChange({ ...draft, lines })}
                onEditLine={setEditingLineKey}
              />
              <InvoiceTotals totals={totals} currency={draft.currency} lang={lang} />
            </>
          )}

          {step === "details" && <InvoiceDetailsPanel draft={draft} onChange={onDraftChange} />}

          {step !== "review" && (
            <div className="bg-ws-actions">
              {stepIndex > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setStep(WORKSPACE_STEPS[stepIndex - 1])}
                >
                  ← Back
                </Button>
              )}
              {/* Never disabled. A blocked Continue here would duplicate the
                  readiness rules per step; the review screen owns that. */}
              <Button variant="primary" onClick={() => setStep(WORKSPACE_STEPS[stepIndex + 1])}>
                Continue →
              </Button>
            </div>
          )}

          {step === "review" &&
            (delivering ? (
              <DeliveryPanel
                customerName={draft.customer?.name ?? "—"}
                customerEmail={draft.customer?.email}
                onSendEmail={onIssue}
                onSendPeppol={onIssue}
                onDownloadPdf={onPreviewPdf}
                onDownloadXml={onPreviewPdf}
              />
            ) : (
              <InvoiceReview
                draft={draft}
                lang={lang}
                onBack={() => setStep("details")}
                onPreviewPdf={onPreviewPdf}
                onContinue={() => setDelivering(true)}
              />
            ))}
        </div>

        <aside className="bg-ws__preview">
          <LiveInvoicePreview draft={draft} company={company} template={template} lang={lang} />
        </aside>
      </div>

      <CreateCustomerDrawer
        open={creatingCustomer}
        saving={saving}
        onClose={() => setCreatingCustomer(false)}
        onSubmit={(customer) => {
          // Selected immediately — the user is mid-invoice, and making them
          // find the client they just typed is the whole reason for the drawer.
          onDraftChange({ ...draft, customer });
          onCreateCustomer(customer);
          setCreatingCustomer(false);
        }}
      />

      <EditItemDrawer
        key={editingLineKey ?? "none"}
        open={editingLine !== null}
        line={editingLine}
        currency={draft.currency}
        lang={lang}
        vatRates={vatRates}
        onClose={() => setEditingLineKey(null)}
        onChange={(line) =>
          onDraftChange({
            ...draft,
            lines: draft.lines.map((existing) => (existing.key === line.key ? line : existing)),
          })
        }
        onRemove={(key) => {
          onDraftChange({ ...draft, lines: draft.lines.filter((line) => line.key !== key) });
          setEditingLineKey(null);
        }}
      />
    </div>
  );
}
