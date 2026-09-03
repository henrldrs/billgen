/** Dev-only preview of the un-integrated scaffolds. NOT a product screen.
 *
 *  Mounted at `/_preview` from App.tsx behind `import.meta.env.DEV`, so it does
 *  not exist in a production build. It owns no IA node, appears in no nav, and
 *  is reachable only by typing the address.
 *
 *  It exists because the two scaffolds — `@billgen/ui/src/workspace` and
 *  `@billgen/ui/src/tva` — are deliberately not exported from the package
 *  index, which means nothing in the app can render them and nobody can look
 *  at them. This page imports them by deep path (the same way styles.css
 *  already deep-imports the scaffold kit's CSS), so the package's public
 *  surface stays untouched and "integrating the feature" remains a separate,
 *  deliberate act.
 *
 *  **Every value below is a literal.** No API call, no session, no company —
 *  which is the point: what you are looking at is the component, not a screen
 *  wired to a backend that does not exist yet. Anything that would need a
 *  server (saving, issuing, sending, uploading) logs and does nothing.
 *
 *  To remove: delete this file and the one `<Route path="_preview">` line in
 *  App.tsx. Nothing else refers to it.
 */

import { useState } from "react";
import { Banner, Button, Card, EuroField, GlassFilters, Segmented } from "@henrioutai/ui";
import {
  DeliveryPanel,
  InvoiceWorkspace,
  TemplateWorkspace,
  defaultTemplate,
  sampleByKey,
  type CatalogItem,
  type CustomerOption,
  type InvoiceDraft,
  type InvoiceTemplate,
  type PreviewCompany,
  type VatRateOption,
} from "@billgen/ui/src/workspace";
import {
  ExpenseEvidencePanel,
  ExpenseImportPanel,
  TvaAnalyzerPanel,
  TvaExceptionQueue,
  type ExpenseSummary,
  type TvaPosition,
} from "@billgen/ui/src/tva";

// Dynamic, and guarded — not decoration. A static `import "...css"` is a side
// effect Rollup must preserve even after it tree-shakes this whole component
// out of a production build, so the scaffold's stylesheets ended up in the
// shipped CSS while the code that uses them did not. Verified by grepping
// dist/assets/*.css after `npm run build`.
if (import.meta.env.DEV) {
  void import("@billgen/ui/src/workspace/workspace.css");
  void import("@billgen/ui/src/tva/tva.css");
}

// ------------------------------------------------------------- sample data

const COMPANY: PreviewCompany = {
  name: "Henri Outai SRL",
  vatNumber: "BE 0987.654.321",
  addressLine: "Avenue Louise 143",
  postalCode: "1050",
  city: "Brussels",
  country: "BE",
};

const CUSTOMERS: CustomerOption[] = [
  { id: "c1", name: "Acme SRL", vatNumber: "BE 0123.456.749", city: "Brussels", isBusiness: true },
  { id: "c2", name: "Maison Dupont", vatNumber: "BE 0456.789.012", city: "Antwerp", isBusiness: true },
  { id: "c3", name: "Mistral SAS", vatNumber: "FR 12345678901", city: "Paris", isBusiness: true },
  { id: "c4", name: "Claire Peeters", city: "Ghent", isBusiness: false },
];

const CATALOG: CatalogItem[] = [
  { id: "p1", name: "Website development", unitPrice: "1000.00", vatRate: "21", unit: "project" },
  { id: "p2", name: "Website maintenance", unitPrice: "250.00", vatRate: "21", unit: "month" },
  { id: "p3", name: "Web hosting", unitPrice: "35.00", vatRate: "21", unit: "month" },
  { id: "p4", name: "Printed documentation", unitPrice: "200.00", vatRate: "12", unit: "unit" },
];

/** Shaped like `GET /vat-rates` returns. The composer keeps no list of its own. */
const VAT_RATES: VatRateOption[] = [
  { value: "21", label: "21% — standard" },
  { value: "12", label: "12% — reduced" },
  { value: "6", label: "6% — reduced" },
  { value: "0", label: "0% — exempt / reverse charge" },
];

const POSITION: TvaPosition = {
  expenses_analyzed: 84,
  detected: "3450.00",
  // Split on purpose — there is no combined total, and this page shows why.
  confirmed_recoverable: "2414.00",
  potential_recoverable: "426.00",
  review_required: "426.00",
  non_recoverable: "184.00",
  collected: "18420.00",
  estimated_payable: "16006.00",
  unresolved_exceptions: 3,
  breakdown: [
    { treatment: "recoverable", count: 71, detected: "2414.00", recoverable: "2414.00" },
    { treatment: "partial", count: 6, detected: "426.00", recoverable: "213.00" },
    { treatment: "non_recoverable", count: 4, detected: "184.00", recoverable: "0.00" },
    { treatment: "review_required", count: 3, detected: "426.00", recoverable: "0.00" },
  ],
};

const EXPENSES: ExpenseSummary[] = [
  {
    id: "e1",
    state: "analyzed",
    supplier_name: "Total Belgium",
    invoice_number: "TB-77120",
    invoice_date: "2026-08-14",
    total_ttc: "605.00",
    currency: "EUR",
    expense_category: "vehicle",
    duplicate_of_id: null,
    source_document_url: null,
    checks: [
      { code: "supplier_vat_present", status: "passed" },
      { code: "arithmetic_consistent", status: "passed" },
      { code: "rate_standard", status: "passed" },
    ],
    classification: {
      treatment: "review_required",
      confidence: "medium",
      detected_amount: "105.00",
      recoverable_amount: "0.00",
      deductible_percent: "50",
      reason_codes: ["vehicle_business_use_unknown"],
      confirmed_at: null,
    },
  },
  {
    id: "e2",
    state: "analyzed",
    supplier_name: "Brasserie du Coin",
    invoice_number: "2026-0431",
    invoice_date: "2026-08-09",
    total_ttc: "345.71",
    currency: "EUR",
    expense_category: "restaurant",
    duplicate_of_id: null,
    source_document_url: null,
    checks: [
      { code: "supplier_vat_present", status: "passed" },
      { code: "arithmetic_consistent", status: "passed" },
    ],
    classification: {
      treatment: "review_required",
      confidence: "low",
      detected_amount: "60.00",
      recoverable_amount: "0.00",
      deductible_percent: "0",
      reason_codes: ["food_and_drink_excluded"],
      confirmed_at: null,
    },
  },
  {
    id: "e3",
    state: "analyzed",
    supplier_name: null,
    invoice_number: null,
    invoice_date: "2026-08-02",
    total_ttc: "254.10",
    currency: "EUR",
    expense_category: null,
    duplicate_of_id: null,
    source_document_url: null,
    checks: [
      { code: "supplier_missing", status: "failed" },
      { code: "invoice_number_missing", status: "failed" },
      { code: "supplier_vat_missing", status: "warning" },
      { code: "arithmetic_incomplete", status: "warning" },
    ],
    classification: {
      treatment: "review_required",
      confidence: "low",
      detected_amount: "42.00",
      recoverable_amount: "0.00",
      deductible_percent: "0",
      reason_codes: ["supplier_missing", "invoice_number_missing"],
      confirmed_at: null,
    },
  },
];

// ------------------------------------------------------------------- page

type Surface =
  | "workspace"
  | "studio"
  | "delivery"
  | "tva_analyzer"
  | "tva_queue"
  | "tva_evidence"
  | "tva_import"
  | "palette";

const SURFACES: { value: Surface; label: string }[] = [
  { value: "workspace", label: "Invoice workspace" },
  { value: "studio", label: "Template studio" },
  { value: "delivery", label: "Delivery" },
  { value: "tva_analyzer", label: "TVA analyzer" },
  { value: "tva_queue", label: "TVA queue" },
  { value: "tva_evidence", label: "TVA evidence" },
  { value: "tva_import", label: "TVA import" },
  { value: "palette", label: "Palette + grounds" },
];

/** The colours that came over from billgen.be, named the way tokens.css names
 *  them. Listed rather than derived: the point of looking at this surface is to
 *  see what the site actually contributed, and a loop over every --brand-* would
 *  bury that in the sixty tokens that were already here. */
const SITE_COLOURS: { token: string; note: string }[] = [
  { token: "--brand-logo-ink", note: "\"Bill\"" },
  { token: "--brand-logo-green", note: "\"Gen\", and the folded corner of the mark" },
  { token: "--brand-logo-paper", note: "the warm off-white behind the mark" },
  { token: "--brand-logo-sand", note: "the warm wash on paper" },
  { token: "--brand-logo-green-300", note: "washes over the deep field" },
  { token: "--brand-deep-00", note: "sapphire, top of the ramp" },
  { token: "--brand-deep-34", note: "surface in dark mode" },
  { token: "--brand-deep-76", note: "" },
  { token: "--brand-deep-100", note: "sapphire, bottom — the page in dark mode" },
  { token: "--brand-deep-ink", note: "text on the field" },
  { token: "--brand-deep-glyph", note: "the € motif on dark" },
  { token: "--brand-deep-shadow", note: "elevation, instead of black" },
];

/** Anything that would need a server. Loud in the console, silent on screen. */
function unavailable(what: string) {
  return () => console.info(`[preview] "${what}" needs an endpoint that does not exist yet.`);
}

export function PreviewRoute() {
  const [surface, setSurface] = useState<Surface>("workspace");
  const [draft, setDraft] = useState<InvoiceDraft>(() => sampleByKey("typical").draft);
  const [template, setTemplate] = useState<InvoiceTemplate>(() => defaultTemplate());
  const [importing, setImporting] = useState(false);

  return (
    <div className="bg-stack" style={{ padding: "1.5rem" }}>
      <Banner tone="warn" title="Component preview — not a product screen">
        These components are scaffolds: they are not exported from the package index, no route in
        the app reaches them, and no endpoint behind them exists. Every value here is a literal, and
        saving, issuing, sending and uploading all do nothing. Development builds only.
      </Banner>

      <Segmented
        ariaLabel="Preview surface"
        value={surface}
        onChange={setSurface}
        options={SURFACES}
      />

      {surface === "workspace" && (
        <InvoiceWorkspace
          draft={draft}
          onDraftChange={setDraft}
          company={COMPANY}
          template={template}
          customers={CUSTOMERS}
          catalog={CATALOG}
          vatRates={VAT_RATES}
          onSaveDraft={unavailable("Save draft")}
          onCreateCustomer={unavailable("Create customer")}
          onPreviewPdf={unavailable("Preview PDF")}
          onIssue={unavailable("Issue invoice")}
          onExit={unavailable("Back to invoices")}
        />
      )}

      {surface === "studio" && (
        <TemplateWorkspace
          template={template}
          company={COMPANY}
          onChange={setTemplate}
          onSave={unavailable("Save template")}
          onPublish={unavailable("Publish template")}
          onExit={unavailable("Back to templates")}
        />
      )}

      {surface === "delivery" && (
        <DeliveryPanel
          customerName={draft.customer?.name ?? "Acme SRL"}
          customerEmail={draft.customer?.email}
          onSendEmail={unavailable("Send email")}
          onSendPeppol={unavailable("Send via Peppol")}
          onDownloadPdf={unavailable("Download PDF")}
          onDownloadXml={unavailable("Download XML")}
        />
      )}

      {surface === "tva_analyzer" && (
        <TvaAnalyzerPanel
          position={POSITION}
          periodLabel="Q3 2026"
          onReviewExceptions={() => setSurface("tva_queue")}
          onExport={unavailable("Export TVA report")}
        />
      )}

      {surface === "tva_queue" && (
        <TvaExceptionQueue expenses={EXPENSES} onOpen={() => setSurface("tva_evidence")} />
      )}

      {surface === "tva_evidence" && (
        <ExpenseEvidencePanel
          expense={EXPENSES[0]}
          onAccept={unavailable("Accept treatment")}
          onChangeTreatment={unavailable("Change treatment")}
        />
      )}

      {surface === "tva_import" && (
        <div className="bg-stack">
          <Segmented
            ariaLabel="Import state"
            value={importing ? "progress" : "idle"}
            onChange={(value) => setImporting(value === "progress")}
            options={[
              { value: "idle", label: "Dropzone" },
              { value: "progress", label: "In progress" },
            ]}
          />
          <ExpenseImportPanel
            progress={importing ? { total: 24, processed: 17, failed: 0 } : null}
            result={null}
            onFiles={unavailable("Upload expenses")}
            onReview={unavailable("Review expenses")}
          />
        </div>
      )}

      {surface === "palette" && (
        <div className="bg-stack">
          {/* Mounted here rather than in AppShell on purpose: the filters are
              what the frosted card references, and nothing in the product uses
              a frosted card yet. When one does, this moves to the shell — it
              has to exist exactly once in the document. */}
          <GlassFilters />

          <Banner tone="info" title="What billgen.be contributed">
            Dark mode is now the site&apos;s sapphire field rather than Tailwind slate, and the
            light ground is the site&apos;s paper. Switch the theme from the account menu to see
            both. The accent is still emerald in both — that decision is separate and is written
            down in BRAND_TOKENS.md.
          </Banner>

          {/* The two grounds, side by side. Height is fixed because the point
              is the gradient, and a ground you can only see 40px of is not a
              ground you can judge. */}
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                minHeight: "22rem",
                borderRadius: "var(--bg-radius-surface)",
                background: "var(--bg-paper)",
                border: "1px solid var(--bg-line)",
              }}
            >
              <EuroField tone="ink" />
              <div style={{ position: "relative", padding: "var(--bg-pad-card)" }}>
                <h3 style={{ margin: 0, color: "var(--bg-ink)" }}>Paper</h3>
                <p style={{ color: "var(--bg-ink-soft)" }}>
                  --bg-paper, and the € field in its ink tone. This is what --bg-app-backdrop now
                  resolves to in light mode.
                </p>
                <Button>Primary action</Button>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                minHeight: "22rem",
                borderRadius: "var(--bg-radius-surface)",
                background: "var(--bg-deep)",
              }}
            >
              <EuroField tone="light" />
              <div style={{ position: "relative", padding: "var(--bg-pad-card)" }}>
                <h3 style={{ margin: 0, color: "var(--bg-deep-ink)" }}>Sapphire</h3>
                <p style={{ color: "var(--bg-deep-ink-soft)" }}>
                  --bg-deep, and the € field in its light tone. This is --bg-app-backdrop in dark
                  mode — the same surface as the site, not a second dark theme.
                </p>
                <Card frosted="soft" padded>
                  <strong style={{ color: "var(--bg-deep-ink)" }}>Frosted card</strong>
                  <p style={{ color: "var(--bg-deep-ink-soft)", margin: "0.5rem 0 0" }}>
                    Turbulence + displacement over the blur. Chromium distorts; Safari falls back
                    to plain frost.
                  </p>
                </Card>
              </div>
            </div>
          </div>

          <Card title="Colours that came over">
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))",
              }}
            >
              {SITE_COLOURS.map(({ token, note }) => (
                <div key={token} style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <span
                    style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      flex: "0 0 auto",
                      borderRadius: "var(--bg-radius-sm)",
                      background: `var(${token})`,
                      border: "1px solid var(--bg-line)",
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <code style={{ fontSize: "var(--bg-text-helper)" }}>{token}</code>
                    {note ? (
                      <span
                        style={{
                          display: "block",
                          fontSize: "var(--bg-text-helper)",
                          color: "var(--bg-ink-soft)",
                        }}
                      >
                        {note}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
