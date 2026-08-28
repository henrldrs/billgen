# Invoice Workspace + Template Studio — scaffold

Written from [`docs/build_template_feature_future.md`](../../../docs/build_template_feature_future.md).
Section references (§n) are to that document.

**This directory is not wired.** `src/index.ts` does not re-export it, so
`frontend-saas` cannot import any of it; `routes.tsx`, `App.tsx` and
`scaffold/ia.ts` are untouched; `workspace.css` is imported by nothing. The
package's public surface is byte-identical to before, which is what makes this
safe to leave sitting here.

It does typecheck and it does build — `npm --workspace @billgen/ui run
typecheck` covers `src/**`, so this code cannot rot silently.

## What is here

| File | Blueprint | Notes |
|---|---|---|
| `types.ts` | §1 | The draft type. Deliberately not the generated `InvoiceResponse` — see the file. |
| `totals.ts` | §7 | Live totals *for display only*. The server's are the binding ones. |
| `readiness.ts` | §8 | The one place a draft becomes issuable. Blocking vs. warning is load-bearing. |
| `InvoiceWorkspace.tsx` | §1 | Four steps, full-screen, live preview. The stepper navigates; it does not gate. |
| `InvoiceCustomerPicker.tsx` | §2 | Six states kept apart — notably "searching" ≠ "no results". |
| `CreateCustomerDrawer.tsx` | §3 | Inline creation; the new customer is selected immediately. |
| `InvoiceItemsEditor.tsx` | §4 | Catalog suggests, never constrains. Free-text lines are first-class. |
| `EditItemDrawer.tsx` | §5 | Six controls off the canvas; breaks the catalog link on edit. |
| `InvoiceDetailsPanel.tsx` | §6 | Progressive disclosure — one section open, three collapsed. |
| `InvoiceTotals.tsx` | §7 | Per-rate VAT summary appears automatically on a second rate. |
| `InvoiceReview.tsx` | §8 | Continue is disabled while anything blocks. |
| `DeliveryPanel.tsx` | §9 | Makes "Download XML ≠ Send via Peppol" visible instead of papering over it. |
| `LiveInvoicePreview.tsx` | §1, §18 | One renderer, shared by the composer and the studio. |
| `templateSchema.ts` | §15–§19 | Blocks, appearance, versions, and the issued-invoice snapshot. |
| `sampleInvoice.ts` | §18 | Three samples chosen to break layouts, not to flatter them. |
| `TemplateList.tsx` | §13, §20 | Gallery, default badge, action menu. |
| `TemplateWorkspace.tsx` | §14 | Blocks · document · properties. |
| `BlockLibrary.tsx` | §15 | A list, not a drag-and-drop palette. |
| `PropertyPanel.tsx` | §16 | One switch over the block union; TypeScript does the rest. |
| `AppearancePanel.tsx` | §17 | Token choices, not a colour picker — see below. |

## Three rules this scaffold commits to

1. **No freeform positioning.** A template is an ordered list of typed blocks.
   A canvas with x/y coordinates lets a user produce a document missing a
   legally required mention, and `core/pdf` is a Jinja template that could not
   honour arbitrary geometry anyway.
2. **No raw colour anywhere, including in stored data.** `AppearancePanel`
   offers a choice among semantic tokens. A hex field on a template would put
   the exact bypass the palette guard forbids in component code into a database
   row where no test can see it. This is a real reduction in what users can do;
   the honest way to give brand colour back is a named organization colour that
   *becomes* a token.
3. **An issued invoice keeps its `TemplateSnapshot`.** Editing a template must
   never restyle a document already sent to a customer. `snapshot()` exists in
   `templateSchema.ts` with no runtime behind it because this is cheap now and
   expensive after the first thousand invoices.

## What it deliberately does not do

- **No data fetching.** Every component takes props and emits callbacks. That
  is why nothing here needs a `QueryClient`, a server, or a mock — and why
  integrating it is wiring rather than rewriting.
- **No i18n.** Strings are English literals. `t()` takes a closed `MessageKey`
  union, so real copy means adding keys to `lib/translations.ts` in fr/nl/en/es
  — which is translation work, not component work, and doing it badly now would
  bake in four wrong Belgian invoice terms.
- **No toasts.** `ToastProvider` is on the audit's list and is app-level
  infrastructure; these components report through callbacks so the app decides.

## Integrating it

1. **Endpoints first.** The composer needs `GET /vat-rates`, `GET /clients`,
   `GET /products` (all exist) and `GET /vat-treatment` to default the line
   category. The studio needs a template CRUD that does not exist at all —
   `core/pdf/registry.py` currently holds fixed named templates.
2. **Backend for templates.** A `templates` table, a version table, and a
   `template_snapshot` JSON column on `invoices`. Rule 3 is worthless without
   that last one.
3. **CSS.** One line in `frontend-saas/src/styles.css`:
   `@import "@billgen/ui/src/workspace/workspace.css";`
4. **Exports.** Add the components the app mounts to `src/index.ts` — the
   specific ones, not `export * from "./workspace"`.
5. **Routes.** `/sales/invoices/new` and `/settings/invoice-templates` in
   `routes.tsx`, plus their `ia.ts` nodes.
6. **Tests.** Every sibling panel has a `.test.tsx`. These do not yet; that is
   the honest cost of scaffolding ahead of integration, and it is the first
   thing to pay down when the endpoints land.
