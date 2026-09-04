/** BillGen information architecture — the single source of truth.
 *
 *  Nav, routes, the roadmap document and the "is this wired?" badges all read
 *  from this tree. Adding a product area means adding a node here; nothing
 *  else needs to know the shape of the app.
 *
 *  `status` is about the BACKEND, not the design:
 *    wired   — a real endpoint exists and this screen consumes it
 *    partial — an endpoint exists but cannot carry the whole screen
 *              (read-only where writes are needed, no filter, wrong shape)
 *    none    — nothing on the server answers this at all
 *
 *  Anything not `wired` renders through the scaffold kit (scaffold.css), which
 *  is deliberately ugly — Times New Roman, square 2px borders, dead controls —
 *  so unbuilt surface can never be mistaken for finished work.
 *
 *  Endpoint inventory this was checked against (api/routers/, 2026-08-26):
 *    /auth/{signup,login,refresh,logout,desktop-bootstrap}  /users/me
 *    /orgs/current  /companies[POST,GET,GET id,PATCH id]
 *    /clients[POST,GET,GET id,PATCH]
 *    /products[POST,GET?company_id&status&billing_type,GET id,PATCH]
 *    /invoices[POST,GET?company_id&status&client_id,GET id,POST id/issue,DELETE id,
 *              POST id/void,POST preview,GET id/html,GET id/pdf,
 *              GET id/peppol.xml]
 *    /credit-notes[POST,GET,GET id,GET id/html,GET id/pdf]
 *    /quotes[POST,GET?company_id&status&client_id,GET id,DELETE id,
 *            POST id/{send,accept,reject,expire,convert}]
 *    /payments[POST,GET?invoice_id]
 *    /reports/{kpi,revenue,vat?period,invoices,payments,clients,products}
 *    /vat-rates  /pdf-templates  /vat-treatment?company_id&client_id
 *    /alerts?company_id  /search?q
 *    /activity?limit&target_type&target_id  /backup/{export,restore}
 *    /imports/legacy/{preview,commit}  /healthz  /readyz
 *
 *  Re-checked against api/routers/ on 2026-08-28. Reading this list is the only
 *  thing that stops a node from claiming a backend gap that was closed weeks
 *  ago — which has already happened twice.
 */

export type BackendStatus = "wired" | "partial" | "none";

/** Which of the six roadmap layers a node belongs to (see docs/ROADMAP_IA.md). */
export type Layer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

/**
 * Which frontend can actually render a node.
 *
 * BillGen ships more than one frontend over the same backend, and a few areas
 * only exist on one of them: offline sync, printer selection and auto-update
 * are meaningless in a browser tab, because they need Tauri APIs and a local
 * filesystem. Marking them `desktop` keeps them in the single source of truth
 * while stopping the SaaS router from mounting screens it can never satisfy.
 *
 * Defaults to `both` when omitted, which is correct for the vast majority.
 */
export type Surface = "both" | "saas" | "desktop";

export interface IaNode {
  key: string;
  label: string;
  /** Route path relative to /app. Omitted for grouping-only nodes. */
  path?: string;
  status: BackendStatus;
  layer: Layer;
  /** Endpoints this screen already consumes. */
  endpoints?: string[];
  /** Endpoints the server would have to grow for this to be real. */
  missing?: string[];
  /** Why it is partial, or what the scaffold is standing in for. */
  note?: string;
  /** Which frontend can render this. Defaults to "both". */
  surface?: Surface;
  /**
   * Does this node appear in the navigation? Defaults to true.
   *
   * The IA is two things at once: the coverage ledger the architecture report
   * and `coverage()` read, and the source the shells build their nav from.
   * Those stopped agreeing once the gaps started closing (ROADMAP_IA §11b): a
   * node can be a real, routable, finished screen and still have no business
   * being a destination, because a destination is a place you go BEFORE you
   * know which record you want. `nav: false` says exactly that and nothing
   * else — the node keeps its path, its status and its place in the count.
   */
  nav?: boolean;
  /**
   * Where a `nav: false` node's content actually lives now.
   *
   * Set it and the router redirects this path there instead of rendering it,
   * so a bookmark to `company/vat` still lands somewhere true. Omit it when the
   * node is hidden but still worth rendering on its own (reachable from the
   * palette, or from the coverage map).
   */
  mergedInto?: string;
  children?: IaNode[];
}

export interface IaSection extends IaNode {
  /** Shown in the primary nav bar. Sections without it live under Settings. */
  primary?: boolean;
  children: IaNode[];
}

export const IA: IaSection[] = [
  // ---------------------------------------------------------------- dashboard
  {
    key: "dashboard",
    label: "Dashboard",
    path: "",
    status: "partial",
    layer: "L1",
    primary: true,
    note: "KPIs and revenue are real; alerts have no source.",
    children: [
      {
        key: "dashboard.overview",
        label: "Financial overview",
        status: "wired",
        layer: "L1",
        endpoints: ["GET /reports/kpi"],
      },
      {
        key: "dashboard.revenue",
        label: "Revenue",
        status: "wired",
        layer: "L1",
        endpoints: ["GET /reports/revenue"],
      },
      {
        key: "dashboard.outstanding",
        label: "Outstanding invoices",
        status: "wired",
        layer: "L1",
        endpoints: ["GET /reports/kpi"],
      },
      {
        key: "dashboard.overdue",
        label: "Overdue invoices",
        status: "wired",
        layer: "L1",
        endpoints: ["GET /reports/kpi", "GET /invoices?status=overdue"],
      },
      {
        key: "dashboard.activity",
        label: "Recent activity",
        status: "wired",
        layer: "L1",
        endpoints: ["GET /activity?limit"],
      },
      {
        key: "dashboard.quickactions",
        label: "Quick actions",
        status: "wired",
        layer: "L1",
        note: "Pure client-side navigation — needs no endpoint.",
      },
      {
        key: "dashboard.alerts",
        label: "Alerts & tasks",
        status: "none",
        layer: "L2",
        endpoints: ["GET /alerts?company_id&today&limit"],
        note: "The rules engine landed 2026-08-28: overdue invoices (a partial payment leaves only the remainder), forgotten drafts, business clients with no VAT number, and the company's own identifiers — each a code plus a context dict, severity-ranked, with counts covering everything that fired while the list is capped. `status` stays `none` because no screen consumes it yet: this is a screen to build, not a backend to write.",
      },
    ],
  },

  // -------------------------------------------------------------------- sales
  {
    key: "sales",
    label: "Sales",
    path: "sales",
    status: "partial",
    layer: "L1",
    primary: true,
    children: [
      {
        key: "sales.invoices",
        label: "Invoices",
        path: "sales/invoices",
        status: "wired",
        layer: "L1",
        endpoints: [
          "GET /invoices?company_id&status",
          "POST /invoices",
          "POST /invoices/{id}/issue",
          "POST /invoices/{id}/void",
          "DELETE /invoices/{id}",
        ],
        // No "All" child: this node IS the unfiltered list, so the children are
        // exactly the status filters. Two nodes sharing one path would shadow
        // each other in the router (enforced by ia.test.ts).
        children: [
          {
            key: "sales.invoices.draft",
            label: "Drafts",
            path: "sales/invoices/draft",
            status: "wired",
            layer: "L1",
            endpoints: ["GET /invoices?status=draft"],
          },
          {
            key: "sales.invoices.issued",
            label: "Issued",
            path: "sales/invoices/issued",
            status: "wired",
            layer: "L1",
            endpoints: ["GET /invoices?status=issued"],
          },
          {
            key: "sales.invoices.sent",
            label: "Sent",
            path: "sales/invoices/sent",
            status: "none",
            layer: "L2",
            missing: [
              "InvoiceStatus.SENT",
              "POST /invoices/{id}/send",
              "GET /invoices?status=sent",
            ],
            note: "InvoiceStatus has no 'sent' member — the domain has no concept of delivery yet. Requires an email/Peppol dispatch service.",
          },
          {
            key: "sales.invoices.viewed",
            label: "Viewed",
            path: "sales/invoices/viewed",
            status: "none",
            layer: "L2",
            missing: [
              "InvoiceStatus.VIEWED",
              "GET /invoices/{id}/tracking",
              "public receipt-pixel or portal endpoint",
            ],
            note: "Needs a client-facing invoice portal to observe a view at all.",
          },
          {
            key: "sales.invoices.paid",
            label: "Paid",
            path: "sales/invoices/paid",
            status: "wired",
            layer: "L1",
            endpoints: ["GET /invoices?status=paid"],
          },
          {
            key: "sales.invoices.partial",
            label: "Partially paid",
            path: "sales/invoices/partially_paid",
            status: "wired",
            layer: "L1",
            endpoints: ["GET /invoices?status=partially_paid"],
          },
          {
            key: "sales.invoices.overdue",
            label: "Overdue",
            path: "sales/invoices/overdue",
            status: "wired",
            layer: "L1",
            endpoints: ["GET /invoices?status=overdue"],
          },
          {
            key: "sales.invoices.voided",
            label: "Cancelled",
            path: "sales/invoices/voided",
            status: "wired",
            layer: "L1",
            endpoints: ["GET /invoices?status=voided"],
            note: "The domain calls this 'voided'; the UI label follows the user's vocabulary.",
          },
        ],
      },
      {
        key: "sales.invoice.detail",
        label: "Invoice detail & lifecycle",
        path: "sales/invoices/id/:invoiceId",
        nav: false,
        status: "partial",
        layer: "L2",
        endpoints: [
          "GET /invoices/{id}",
          "GET /invoices/{id}/pdf",
          "GET /invoices/{id}/peppol.xml",
          "GET /payments?invoice_id",
          "POST /payments",
          "POST /invoices/{id}/issue",
          "POST /invoices/{id}/void",
          "DELETE /invoices/{id}",
          "GET /activity?target_id",
          "POST /invoices/{id}/duplicate",
        ],
        missing: ["POST /invoices/{id}/send"],
        note: "Header, lines, frozen totals, payments, exports, duplicate and the full audit timeline are real: /activity grew target_id, and every invoice event — including payments — is written with target_type=\"invoice\" and target_id=<invoice id>. Only delivery is fiction: InvoiceStatus has no SENT or VIEWED member and there is no email transport, so Send alone stays in a scaffold block inside the screen. Duplicate left it 2026-08-27 — the endpoint had shipped and the scaffold was describing a gap that had closed. Not a nav destination (§11b): same :invoiceId problem as Client 360, and the same fix. Reached from the invoice list.",
      },
      {
        key: "sales.creditnotes",
        label: "Credit notes",
        path: "sales/credit-notes",
        status: "wired",
        layer: "L2",
        endpoints: [
          "GET /credit-notes",
          "POST /credit-notes",
          "GET /credit-notes/{id}",
          "GET /credit-notes/{id}/pdf",
        ],
      },
      {
        key: "sales.recurring",
        label: "Recurring invoices",
        path: "sales/recurring",
        status: "none",
        layer: "L2",
        missing: [
          "RecurringInvoice model",
          "CRUD /recurring-invoices",
          "scheduler / job runner",
        ],
        note: "Product.billing_type already has a RECURRING member, but nothing schedules or generates anything.",
      },
      {
        key: "sales.quotes",
        label: "Quotes",
        path: "sales/quotes",
        status: "none",
        layer: "L2",
        endpoints: [
          "POST /quotes",
          "GET /quotes?company_id&status&client_id",
          "GET /quotes/{id}",
          "POST /quotes/{id}/{send,accept,reject,expire}",
          "POST /quotes/{id}/convert",
          "DELETE /quotes/{id}",
        ],
        missing: ["PDF template"],
        note: "Backend landed 2026-08-28. Its own numbering series (Q-{prefix}{YYYY}/{NNNN}, sequence scope 'quote'), never the invoice one — a refused offer must not leave a hole in a gapless series. Converting produces a DRAFT invoice: the gapless number is still consumed by POST /invoices/{id}/issue and nowhere else. Expiry is derived, so the response carries `effective_status` beside `status`. What is left is the screen, plus a quote PDF template — the latter is wording, which is a decision rather than a coding gap.",
      },
      {
        key: "sales.proforma",
        label: "Pro-forma invoices",
        path: "sales/proforma",
        status: "none",
        layer: "L2",
        missing: ["proforma flag on Invoice or its own series", "PDF template"],
        note: "A pro-forma must NOT consume a gapless invoice number — this touches core/repository/sequence_repo.",
      },
      {
        key: "sales.reminders",
        label: "Payment reminders",
        path: "sales/reminders",
        status: "none",
        layer: "L2",
        missing: [
          "Reminder model + schedule",
          "email transport",
          "Belgian legal reminder templates",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- customers
  {
    key: "customers",
    label: "Clients",
    path: "customers",
    status: "partial",
    layer: "L1",
    primary: true,
    children: [
      {
        key: "customers.clients",
        label: "Clients",
        path: "customers/clients",
        status: "wired",
        layer: "L1",
        endpoints: [
          "GET /clients",
          "POST /clients",
          "GET /clients/{id}",
          "PATCH /clients/{id}",
        ],
      },
      {
        key: "customers.detail",
        label: "Client 360",
        path: "customers/clients/:clientId",
        nav: false,
        status: "partial",
        layer: "L2",
        endpoints: [
          "GET /clients/{id}",
          "GET /invoices?client_id",
          "GET /activity?target_id",
        ],
        missing: [
          "GET /clients/{id}/stats",
          "Document model + CRUD /documents",
          "ClientGroup model + CRUD /client-groups",
          "GET /reports/clients",
        ],
        note: "Identity, invoice history and the audit trail are real. The totals strip, quotes, documents, tags and risk flags are quarantined into scaffold blocks inside the screen — each maps to a model that does not exist rather than to a screen nobody built. Not a nav destination (§11b): its path carries :clientId, so a menu entry for it navigates to the literal string. It was one until 2026-08-27 — a dead link nobody clicked because the record is reached by clicking a row, which is the point of the rule.",
      },
      {
        key: "customers.contacts",
        label: "Contacts",
        path: "customers/contacts",
        nav: false,
        mergedInto: "customers/clients",
        status: "none",
        layer: "L2",
        missing: ["Contact model (many per client)", "CRUD /contacts"],
        note: "Client currently carries one flat email/phone. Multiple named contacts is a schema change. Curated out of the nav 2026-08-27 (§11b): contacts belong to A client, so the destination is the client list — pick the record, then read its contacts in Client 360.",
      },
      {
        key: "customers.groups",
        label: "Client groups",
        path: "customers/groups",
        status: "none",
        layer: "L2",
        missing: ["ClientGroup model", "CRUD /client-groups"],
      },
      {
        key: "customers.history",
        label: "Client history",
        path: "customers/history",
        nav: false,
        mergedInto: "customers/clients",
        status: "none",
        layer: "L2",
        missing: ["GET /clients/{id}/timeline (invoices + payments + credit notes)"],
        note: "The COMMERCIAL relationship over time — what was invoiced, what was paid, what was credited. Not the audit log: invoice, payment and credit-note entries are written with target_type=\"invoice\" and target_id=<invoice id>, and carry no client_id anywhere, not even in their `after` payload. So GET /activity?target_id={client} can never return them — it returns only the three things written against a client row (created, edited, imported). That is customers.activity, one node down. This needs a join the server does not expose. Curated out of the nav 2026-08-27 (§11b): per-client by definition. Redirects to the list rather than to the 360 screen because that screen needs a client id and this path carries none.",
      },
      {
        key: "customers.documents",
        label: "Client documents",
        path: "customers/documents",
        nav: false,
        mergedInto: "customers/clients",
        status: "none",
        layer: "L2",
        missing: ["blob storage", "Document model", "CRUD /documents"],
        note: "Curated out of the nav 2026-08-27 (§11b): a per-client document list is a 360 tab; the CROSS-client version is a different question and belongs to the Documents section.",
      },
      {
        key: "customers.activity",
        label: "Client activity",
        path: "customers/activity",
        nav: false,
        status: "wired",
        layer: "L2",
        endpoints: ["GET /activity?target_type=client", "GET /activity?target_id"],
        note: "Who touched this client RECORD: created, edited, imported. Deliberately narrow — the commercial timeline is customers.history, and the who-did-what-in-the-app axis is the Activity section (activity.user, filtered by actor rather than target). Curated out of the nav 2026-08-27 (§11b): a third door onto activity, next to activity/audit and the 360 tab. Hidden but NOT merged — it is a real screen over a real filter, so it keeps rendering for anyone who has the link or reaches it from the palette. Redirecting it would have deleted a working view to tidy a menu.",
      },
    ],
  },

  // ------------------------------------------------------------------ catalog
  {
    key: "catalog",
    label: "Catalog",
    path: "catalog",
    status: "partial",
    layer: "L1",
    primary: true,
    children: [
      {
        key: "catalog.products",
        label: "Products",
        path: "catalog/products",
        status: "wired",
        layer: "L1",
        endpoints: [
          "GET /products",
          "POST /products",
          "GET /products/{id}",
          "PATCH /products/{id}",
        ],
      },
      {
        key: "catalog.services",
        label: "Services",
        path: "catalog/services",
        status: "partial",
        layer: "L1",
        endpoints: ["GET /products", "GET /products?billing_type"],
        missing: ["a product/service discriminator"],
        note: "The filter shipped 2026-08-27 — ProductsPanel has a billing-type control and it queries the server. What is still missing is the CONCEPT: nothing on Product says service-or-good, and billing_type is not that discriminator (a fixed-price service and a fixed-price good are both `fixed`). So this stays partial, and picking one billing type to stand in for ‘a service’ would be the screen inventing a rule the domain does not have. Proposed §11b cut: merge into catalog/products.",
      },
      {
        key: "catalog.categories",
        label: "Categories",
        path: "catalog/categories",
        status: "partial",
        layer: "L2",
        endpoints: ["GET /products"],
        missing: ["Category model", "CRUD /categories", "GET /products?category"],
        note: "Product.category is a free-text string. Real categories need their own table so they can be renamed, coloured and reordered.",
      },
      {
        key: "catalog.pricing",
        label: "Pricing",
        path: "catalog/pricing",
        status: "partial",
        layer: "L2",
        endpoints: ["GET /products", "PATCH /products/{id}"],
        missing: ["PriceList model", "client-specific pricing", "bulk price update"],
      },
      {
        key: "catalog.vat",
        label: "VAT rates",
        path: "catalog/vat",
        status: "partial",
        layer: "L2",
        endpoints: ["GET /vat-rates"],
        note: "Frontend-only from here. GET /vat-rates now serves the Belgian rates and the EN 16931 categories from core/rules/vat.py. Until a screen consumes it, 21/12/6/0 stays duplicated in TypeScript.",
      },
      {
        key: "catalog.templates",
        label: "Invoice templates",
        path: "catalog/templates",
        status: "wired",
        layer: "L2",
        endpoints: [
          "GET /templates",
          "POST /templates",
          "PATCH /templates/{id}",
          "POST /templates/{id}/publish",
          "POST /templates/{id}/default",
          "DELETE /templates/{id}",
          "GET /templates/{id}/snapshot",
          "GET /pdf-templates",
        ],
        note: "Wired 2026-08-28: the visual designer, on real endpoints. Opens on five starter models, blocks are reordered by dragging, and appearance carries one brand colour plus six PDF-safe faces. Writes need pdf_templates_premium — Business and above — and answer 402 below it; reads are open on every tier so a downgraded org still sees what it built. Publishing freezes an immutable version and an issued invoice keeps its own template_snapshot, so editing a template never restyles a document already sent. GET /pdf-templates still lists the four fixed Jinja templates underneath.",
      },
      {
        key: "catalog.archived",
        label: "Archived",
        path: "catalog/archived",
        status: "wired",
        layer: "L2",
        endpoints: ["GET /products?status=archived"],
        note: "Wired 2026-08-27: the same ProductsPanel with the status filter preset, filtering on the SERVER. Not a second list — a preset view of the one list, with the control left visible so it is a starting point rather than a separate place with its own idea of what a product is.",
      },
    ],
  },

  // ---------------------------------------------------------------- reporting
  {
    key: "reports",
    label: "Reports",
    path: "reports",
    status: "partial",
    layer: "L2",
    primary: true,
    children: [
      {
        key: "reports.revenue",
        label: "Revenue",
        path: "reports/revenue",
        status: "wired",
        layer: "L2",
        endpoints: ["GET /reports/revenue?year"],
      },
      {
        key: "reports.invoices",
        label: "Invoices",
        path: "reports/invoices",
        status: "wired",
        layer: "L2",
        endpoints: ["GET /reports/invoices?company_id&period"],
        note: "Wired 2026-08-27 — and the endpoint had shipped well before the screen. This node's previous note said an invoice report ‘would have to be tallied in the browser’, which was true of /invoices and never true of /reports/invoices: counts and money per effective status, plus a monthly series, all server-side. The screen prints `skipped_other_currency` and `draft_count` rather than letting either quietly explain why the columns do not add up.",
      },
      {
        key: "reports.payments",
        label: "Payments",
        path: "reports/payments",
        status: "wired",
        layer: "L2",
        endpoints: [
          "GET /payments?company_id&paid_from&paid_to",
          "GET /reports/payments?company_id&period&client_id",
          "GET /invoices",
          "GET /clients",
        ],
        note: "Wired 2026-08-27: PaymentsReportPanel lists payments across invoices with a server-side date window, and prints no total because none existed — summing the rows here would be money arithmetic in a React component, wrong the moment the window holds two currencies. GET /reports/payments landed 2026-08-28 and prints one: total, per method, per month, largest, first and last payment date, other currencies counted rather than summed. The panel does not read it yet. Its period is the day the money ARRIVED, so it and /reports/invoices legitimately disagree across a quarter boundary. The invoice list and client list are read as a LOOKUP (a payment carries only invoice_id), never as a filter.",
      },
      {
        key: "reports.outstanding",
        label: "Outstanding",
        path: "reports/outstanding",
        status: "wired",
        layer: "L2",
        endpoints: ["GET /reports/kpi"],
      },
      {
        key: "reports.overdue",
        label: "Overdue",
        path: "reports/overdue",
        status: "wired",
        layer: "L2",
        endpoints: ["GET /reports/kpi", "GET /invoices?status=overdue"],
      },
      {
        key: "reports.vat",
        label: "VAT",
        path: "reports/vat",
        status: "partial",
        layer: "L2",
        endpoints: ["GET /reports/vat?period"],
        missing: ["purchase-side data for the deductible-VAT grids"],
        note: "GET /reports/vat?period (YYYY, YYYY-Qn, YYYY-MM) returns output VAT per (category, rate), invoices minus credit notes, with the Belgian grid where the mapping is unambiguous. The screen renders it, and says what it is not: sales only, so grids 59/81-83/86-87 and the 71/72 balance cannot be produced and this is never a return ready to file. Still `partial` for exactly that reason - the missing half is purchases, not UI.",
      },
      {
        key: "reports.clients",
        label: "Clients",
        path: "reports/clients",
        status: "none",
        layer: "L2",
        endpoints: ["GET /reports/clients?company_id&period&today"],
        missing: ["risk signals on GET /reports/clients"],
        note: "Endpoint landed 2026-08-28: revenue, paid, outstanding and overdue per client, biggest first — the table /clients/{id}/stats would be called once per row to build. What it does NOT carry is the risk half Client 360 promises: average days-to-payment and the share of invoices paid late. Those exist per client in /clients/{id}/stats and are not aggregated anywhere. The screen is missing too.",
      },
      {
        key: "reports.products",
        label: "Products & services",
        path: "reports/products",
        status: "none",
        layer: "L2",
        endpoints: ["GET /reports/products?company_id&period"],
        note: "Endpoint landed 2026-08-28: volume and mix by invoice LINE, free-text lines included under product_id null. Amounts are line net HT carrying no share of an invoice-level discount, so this legitimately sums higher than net revenue in /reports/invoices — whatever renders it must not put the two side by side unlabelled. The screen is what is missing.",
      },
      {
        key: "reports.export",
        label: "Export",
        path: "reports/export",
        status: "partial",
        layer: "L2",
        endpoints: ["GET /backup/export"],
        missing: ["GET /reports/export?format=csv|xlsx|pdf"],
        note: "/backup/export is a whole-organisation JSON backup, not a report export.",
      },
    ],
  },

  // ------------------------------------------------------------------ company
  {
    key: "company",
    label: "Company",
    path: "company",
    status: "partial",
    layer: "L1",
    note: "Nine nodes over ONE row. Every child is `nav: false` (ROADMAP_IA §11b, curated 2026-08-27): a company is a single record, so none of these is a place you go before you know which record you want — you are already in the only one there is. CompanySettingsPanel renders the six wired sections at `company`, and the three that block on a model (payment terms, branding, documents) are scaffold blocks inside it. The nodes stay because they are the ledger of what is still missing.",
    children: [
      {
        key: "company.profile",
        label: "Company profile",
        path: "company/profile",
        nav: false,
        mergedInto: "company",
        status: "wired",
        layer: "L1",
        endpoints: ["GET /companies", "POST /companies", "GET /companies/{id}", "PATCH /companies/{id}"],
        note: "Wired 2026-08-27: CompanySettingsPanel edits the record over PATCH /companies/{id}, sending only the fields that changed. logo_key is the one field no screen writes, and it waits on blob storage (B2).",
      },
      {
        key: "company.legal",
        label: "Legal information",
        path: "company/legal",
        nav: false,
        mergedInto: "company",
        status: "wired",
        layer: "L1",
        endpoints: ["POST /companies", "PATCH /companies/{id}"],
        note: "Wired 2026-08-27: legal_name and registration_number are edited by CompanySettingsPanel section=\"legal\".",
      },
      {
        key: "company.vat",
        label: "VAT / BCE information",
        path: "company/vat",
        nav: false,
        mergedInto: "company",
        status: "wired",
        layer: "L1",
        endpoints: ["POST /companies", "PATCH /companies/{id}"],
        note: "Wired 2026-08-27: the VAT number is editable and GET /companies/{id}/validate returns the checksum verdict, which the form renders on the field itself. The verdict describes the SAVED value, so an edited field drops it until saved.",
      },
      {
        key: "company.bank",
        label: "Bank accounts",
        path: "company/bank",
        nav: false,
        mergedInto: "company",
        status: "partial",
        layer: "L1",
        endpoints: ["POST /companies", "PATCH /companies/{id}"],
        missing: ["BankAccount model (many per company)"],
        note: "Wired 2026-08-27: the one IBAN/BIC pair is editable and validated per field. A second bank account still needs a model.",
      },
      {
        key: "company.numbering",
        label: "Invoice numbering",
        path: "company/numbering",
        nav: false,
        mergedInto: "company",
        status: "wired",
        layer: "L1",
        endpoints: ["POST /companies", "PATCH /companies/{id}", "GET /sequences"],
        note: "Wired 2026-08-27, completed 2026-08-28. The prefix is editable and GET /sequences reports every series with its current and next value. The earlier note here said the counter was \"not readable\" — it always was: sequence_repo.snapshot has existed since ADR-0003 for backups, and only the HTTP surface was missing.",
      },
      {
        key: "company.payment-terms",
        label: "Payment conditions",
        path: "company/payment-terms",
        nav: false,
        mergedInto: "company",
        status: "none",
        layer: "L2",
        missing: ["payment_terms_days on Company", "late-fee configuration"],
      },
      {
        key: "company.branding",
        label: "Branding",
        path: "company/branding",
        nav: false,
        mergedInto: "company",
        status: "none",
        layer: "L2",
        missing: ["POST /companies/{id}/logo", "blob storage", "brand colour fields"],
        note: "Company.logo_key is a dangling reference — nothing uploads or serves a logo.",
      },
      {
        key: "company.defaults",
        label: "Invoice defaults",
        path: "company/defaults",
        nav: false,
        mergedInto: "company",
        status: "partial",
        layer: "L2",
        endpoints: ["POST /companies", "PATCH /companies/{id}", "GET /pdf-templates"],
        missing: ["default notes / payment instructions fields"],
        note: "Wired 2026-08-27: currency, language and template are editable, and the template picker is populated from GET /pdf-templates rather than a constant. Notes and payment instructions do not exist on the model.",
      },
      {
        key: "company.documents",
        label: "Company documents",
        path: "company/documents",
        nav: false,
        mergedInto: "company",
        status: "none",
        layer: "L2",
        missing: ["blob storage", "Document model"],
      },
    ],
  },

  // ------------------------------------------------------------------ billing
  {
    key: "billing",
    label: "Billing",
    path: "billing",
    status: "partial",
    layer: "L3",
    note: "B4 landed the entitlement layer: the server knows the four tiers, meters every allowance and refuses with a 402. Plan and Usage read it. Everything else here waits on a payment provider - there is nothing to subscribe to, charge or cancel.",
    children: [
      {
        key: "billing.subscription",
        label: "My subscription",
        path: "billing/subscription",
        status: "none",
        layer: "L3",
        missing: ["Subscription model", "GET /billing/subscription", "payment provider"],
      },
      {
        key: "billing.plan",
        label: "Current plan",
        path: "billing/plan",
        status: "wired",
        layer: "L3",
        endpoints: ["GET /plans", "GET /entitlements"],
        note: "The whole commercial matrix comes from the server (api/entitlements/matrix.py), so the comparison screen holds no copy of it. There is no 'choose this plan' button because there is no checkout - that is billing.change-plan's gap, not this screen's.",
      },
      {
        key: "billing.usage",
        label: "Usage",
        path: "billing/usage",
        status: "wired",
        layer: "L3",
        endpoints: ["GET /entitlements"],
        note: "Every allowance the server meters - invoices and Peppol documents monthly, clients/products/companies/seats as standing totals. Storage is absent because B2 (blob storage) does not exist, so nothing consumes any.",
      },
      {
        key: "billing.invoices",
        label: "Invoices from BillGen",
        path: "billing/invoices",
        status: "none",
        layer: "L3",
        missing: ["GET /billing/invoices", "Merchant-of-Record integration"],
      },
      {
        key: "billing.payment-method",
        label: "Payment method",
        path: "billing/payment-method",
        status: "none",
        layer: "L3",
        missing: ["hosted card form (never our own field)", "GET/PUT /billing/payment-method"],
      },
      {
        key: "billing.history",
        label: "Billing history",
        path: "billing/history",
        status: "none",
        layer: "L3",
        missing: ["GET /billing/history"],
      },
      {
        key: "billing.change-plan",
        label: "Upgrade / downgrade",
        path: "billing/change-plan",
        status: "none",
        layer: "L3",
        missing: ["POST /billing/subscription/change", "proration rules"],
      },
      {
        key: "billing.cancel",
        label: "Cancellation",
        path: "billing/cancel",
        status: "none",
        layer: "L3",
        missing: ["POST /billing/subscription/cancel", "data-retention-after-cancel policy"],
      },
    ],
  },

  // ---------------------------------------------------------------- documents
  {
    key: "documents",
    label: "Documents",
    path: "documents",
    status: "none",
    layer: "L2",
    note: "No blob storage exists anywhere in the stack.",
    children: [
      {
        key: "documents.all",
        label: "All documents",
        path: "documents/all",
        status: "none",
        layer: "L2",
        missing: ["Document model", "object storage (S3/disk)", "GET /documents"],
      },
      {
        key: "documents.folders",
        label: "Folders",
        path: "documents/folders",
        status: "none",
        layer: "L2",
        missing: ["Folder model or path metadata"],
      },
      {
        key: "documents.invoice-attachments",
        label: "Invoice attachments",
        path: "documents/invoice-attachments",
        status: "none",
        layer: "L2",
        missing: ["POST /invoices/{id}/attachments"],
      },
      {
        key: "documents.client",
        label: "Client documents",
        path: "documents/client",
        status: "none",
        layer: "L2",
        missing: ["POST /clients/{id}/documents"],
      },
      {
        key: "documents.company",
        label: "Company documents",
        path: "documents/company",
        status: "none",
        layer: "L2",
        missing: ["POST /companies/{id}/documents"],
      },
      {
        key: "documents.archived",
        label: "Archived",
        path: "documents/archived",
        status: "none",
        layer: "L2",
        missing: ["archived flag on Document"],
      },
      {
        key: "documents.trash",
        label: "Trash",
        path: "documents/trash",
        status: "none",
        layer: "L4",
        missing: ["soft delete + retention window"],
        note: "Ties into GDPR retention — see Privacy.",
      },
    ],
  },

  // ------------------------------------------------------------------ explore
  {
    key: "explore",
    label: "Explore",
    path: "explore",
    status: "none",
    layer: "L6",
    note: "Named 'Explore' rather than 'Research' — it is the app's internal search engine.",
    children: [
      {
        key: "explore.search",
        label: "Global search",
        path: "explore/search",
        status: "none",
        layer: "L6",
        endpoints: ["GET /search?q&limit"],
        note: "The endpoint landed 2026-08-28: invoices, quotes and credit notes by reference, clients by name/email/VAT, products by name/category — capped per kind, with `truncated` when a kind hit its cap. The ⌘K palette still only navigates between pages; wiring it to this is the remaining work, and it is frontend work.",
      },
      {
        key: "explore.filters",
        label: "Advanced filters",
        path: "explore/filters",
        status: "partial",
        layer: "L6",
        endpoints: ["GET /invoices?company_id&status"],
        missing: ["date/amount/client/created-by filters on every list endpoint"],
      },
      {
        key: "explore.saved",
        label: "Saved searches",
        path: "explore/saved",
        status: "none",
        layer: "L6",
        missing: ["SavedSearch model", "CRUD /saved-searches"],
      },
      {
        key: "explore.documents",
        label: "Document search",
        path: "explore/documents",
        status: "none",
        layer: "L6",
        missing: ["full-text index over document contents"],
      },
      {
        key: "explore.activity",
        label: "Activity search",
        path: "explore/activity",
        status: "partial",
        layer: "L6",
        endpoints: ["GET /activity?target_type"],
        missing: ["free-text and date-range search over the audit log"],
      },
    ],
  },

  // ----------------------------------------------------------------- activity
  {
    key: "activity",
    label: "Activity",
    path: "activity",
    status: "partial",
    layer: "L1",
    children: [
      {
        key: "activity.notifications",
        label: "Notifications",
        path: "activity/notifications",
        status: "none",
        layer: "L3",
        missing: ["Notification model", "GET /notifications", "read/unread state", "push or SSE"],
        note: "The NotificationCenter component exists in the design system and has never had a data source.",
      },
      {
        key: "activity.audit",
        label: "Audit log",
        path: "activity/audit",
        status: "wired",
        layer: "L1",
        endpoints: ["GET /activity?limit&target_type"],
      },
      {
        key: "activity.user",
        label: "User activity",
        path: "activity/user",
        status: "wired",
        layer: "L4",
        endpoints: ["GET /activity?actor_user_id"],
        note: "Closed 2026-08-28. The note that said entries \"cannot be filtered by an actor\" was stale — the filter exists and runs in SQL.",
      },
      {
        key: "activity.security",
        label: "Security events",
        path: "activity/security",
        status: "wired",
        layer: "L4",
        endpoints: ["GET /activity/security"],
        missing: ["a producer for AuditAction.error (failed sign-ins)"],
        note: "A filter over the audit log rather than a second table, so the endpoint was cheap. Sign-ins, sign-outs, session revocations and password changes are all recorded. The screen must still render the response's `not_recorded` list: nothing writes a *failed* sign-in, so repeated password guessing leaves no trace, and an empty row must never read as calm.",
      },
      {
        key: "activity.system",
        label: "System events",
        path: "activity/system",
        status: "none",
        layer: "L4",
        missing: ["GET /system/events", "a job runner to produce them"],
        note: "Distinct from security events: this is the app talking about itself (migrations, scheduled jobs, failed deliveries). Nothing runs on a schedule yet, so there is nothing to report.",
      },
    ],
  },

  // ----------------------------------------------------------------- settings
  {
    key: "settings",
    label: "Settings",
    path: "settings",
    status: "partial",
    layer: "L1",
    children: [
      {
        key: "settings.account",
        label: "Account",
        path: "settings/account",
        status: "partial",
        layer: "L3",
        endpoints: ["GET /users/me"],
        missing: ["PATCH /users/me", "email change + re-verification"],
        note: "Profile is readable and not editable.",
      },
      {
        key: "settings.team",
        label: "Users & permissions",
        path: "settings/team",
        status: "none",
        layer: "L3",
        missing: [
          "GET/POST /orgs/current/members",
          "role model (owner/admin/accountant/employee/viewer)",
          "invitation flow",
        ],
        note: "Partly wired 2026-08-28. GET /orgs/current/members lists the organization with the role each person holds, and PATCH sets a role (company.write, and refuses your own — the last owner demoting themselves strands the organization). The earlier note said OrgMembership \"carries no role enum\"; it does, and has since the initial schema, with a four-role matrix in api/authz. What is genuinely missing is the invitation, which needs email (B1).",
      },
      {
        key: "settings.security",
        label: "Security",
        path: "settings/security",
        status: "partial",
        layer: "L4",
        endpoints: [
          "GET /users/me/sessions",
          "DELETE /users/me/sessions/{jti}",
          "POST /users/me/password",
        ],
        missing: ["TOTP enrolment", "login history"],
        note: "Backend-ready except 2FA: the session list shows only live sign-ins, a password change revokes the others, and login history has a source after all — auth_service writes login, logout, session.revoke and password.change. A security score may only count checks that are really performed.",
      },
      {
        key: "settings.notifications",
        label: "Notification preferences",
        path: "settings/notifications",
        status: "none",
        layer: "L3",
        missing: ["NotificationPreference model", "per-channel toggles"],
      },
      {
        key: "settings.email",
        label: "Email",
        path: "settings/email",
        status: "none",
        layer: "L3",
        missing: ["SMTP/provider config", "email templates", "POST /email/test"],
        note: "There is no email transport anywhere in the stack — this blocks reminders, invitations, verification and password reset.",
      },
      {
        key: "settings.integrations",
        label: "Integrations",
        path: "settings/integrations",
        status: "partial",
        layer: "L5",
        endpoints: ["GET /invoices/{id}/peppol.xml"],
        missing: [
          "Peppol Access Point transport",
          "banking (CODA/PSD2)",
          "accounting export",
          "Google Drive / Dropbox",
          "GET/POST /webhooks",
        ],
        note: "Peppol produces validated BIS 3.0 XML but nothing transmits it — the file is downloaded by hand.",
      },
      {
        key: "settings.privacy",
        label: "Data & privacy",
        path: "settings/privacy",
        status: "partial",
        layer: "L4",
        endpoints: [
          "GET /backup/export",
          "GET /trust/privacy/register",
          "GET /trust/subprocessors",
        ],
        missing: [
          "POST /privacy/export (structured GDPR export)",
          "POST /privacy/delete-account",
          "consent records (no storage)",
        ],
        note: "The art. 30 register and the subprocessor list are served from core/trust as data, so the screen can be built now. What is still missing is the two actions: /backup/export is an org backup, not a subject-access export, and there is no deletion workflow. The deletion dialog must show the register's `retained_on_erasure` — invoices and client contacts are frozen for seven years, so \"delete everything\" would be a false promise.",
      },
      {
        key: "settings.cookies",
        label: "Cookie preferences",
        path: "settings/cookies",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/consent/categories"],
        missing: ["consent storage (no table)", "POST /trust/consent", "the banner itself"],
        note: "The four categories and their defaults are served; essential is locked on and nothing else may be pre-ticked. Three of the four have nothing running in them, which is the only reason no banner ships yet — the day one analytics script is added this becomes a live gap.",
      },
      {
        key: "settings.import",
        label: "Import",
        path: "settings/import",
        status: "partial",
        layer: "L5",
        endpoints: ["POST /imports/legacy/preview", "POST /imports/legacy/commit"],
        missing: ["CSV / Excel / UBL importers", "column-mapping endpoint"],
        note: "Only the FinanceFlow BillGen legacy backup format is understood. Generic CSV mapping is unbuilt.",
      },
      {
        key: "settings.export",
        label: "Export",
        path: "settings/export",
        status: "partial",
        layer: "L5",
        endpoints: ["GET /backup/export"],
        missing: ["per-entity selection", "CSV / ZIP / PDF formats"],
        note: "One button, one format (whole-org JSON).",
      },
      {
        key: "settings.backup",
        label: "Backup & restore",
        path: "settings/backup",
        status: "wired",
        layer: "L5",
        endpoints: ["GET /backup/export", "POST /backup/restore"],
      },
      {
        key: "settings.api",
        label: "API & webhooks",
        path: "settings/api",
        status: "none",
        layer: "L5",
        missing: ["ApiKey model", "CRUD /api-keys", "webhook delivery + retries"],
      },
      {
        key: "settings.localization",
        label: "Localization",
        path: "settings/localization",
        status: "partial",
        layer: "L6",
        endpoints: ["POST /companies (default_language)", "PATCH /companies/{id}"],
        missing: ["per-user language", "timezone", "number/date format"],
        note: "Language is editable on the company since B3 closed, but it is still company-wide: there is no user-level preference.",
      },
      {
        key: "settings.appearance",
        label: "Appearance",
        path: "settings/appearance",
        status: "wired",
        layer: "L6",
        note: "Theme is a client-side preference persisted pre-paint — correctly needs no endpoint.",
      },
      {
        key: "settings.advanced",
        label: "Advanced",
        path: "settings/advanced",
        status: "none",
        layer: "L5",
        missing: ["feature flags", "danger-zone operations", "diagnostics dump"],
      },
    ],
  },

  // --------------------------------------------------------------------- help
  {
    key: "help",
    label: "Help & support",
    path: "help",
    status: "partial",
    layer: "L3",
    children: [
      {
        key: "help.center",
        label: "Help center",
        path: "help/center",
        status: "none",
        layer: "L3",
        missing: ["content source (CMS or bundled MDX)"],
      },
      {
        key: "help.getting-started",
        label: "Getting started",
        path: "help/getting-started",
        status: "none",
        layer: "L3",
        missing: ["checklist progress persisted per org"],
      },
      {
        key: "help.tutorials",
        label: "Tutorials",
        path: "help/tutorials",
        status: "none",
        layer: "L3",
        missing: ["content source"],
      },
      {
        key: "help.faq",
        label: "FAQ",
        path: "help/faq",
        status: "none",
        layer: "L3",
        missing: ["content source"],
      },
      {
        key: "help.contact",
        label: "Contact support",
        path: "help/contact",
        status: "none",
        layer: "L3",
        missing: ["POST /support/tickets", "email transport", "support inbox"],
      },
      {
        key: "help.status",
        label: "System status",
        path: "help/status",
        status: "partial",
        layer: "L5",
        endpoints: ["GET /healthz", "GET /readyz"],
        missing: [
          "per-subsystem health (PDF engine, Peppol, email, payments)",
          "incident history",
        ],
        note: "Liveness and readiness are real. /readyz already knows whether the PDF engine is available, which is the one honest per-subsystem signal available today.",
      },
      {
        key: "help.whatsnew",
        label: "What's new",
        path: "help/whats-new",
        status: "none",
        layer: "L3",
        missing: ["changelog source", "seen/unseen state per user"],
      },
    ],
  },

  // -------------------------------------------------------------------- legal
  {
    key: "legal",
    label: "Legal",
    path: "legal",
    status: "partial",
    layer: "L4",
    endpoints: ["GET /trust/legal/documents"],
    missing: ["the text of all seven documents"],
    note: "BillGen's own legal framework — distinct from customer contracts below. The registry is built (core/trust/legal.py, served publicly so the marketing site and the app read one source); every document in it is undrafted. That split is the point: engineering owns the ledger, a lawyer owns the prose, and the endpoint reports which paragraphs are outstanding.",
    children: [
      {
        key: "legal.tos",
        label: "Terms of Service",
        path: "legal/terms",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/legal/documents/terms"],
        missing: ["drafted document", "version + acceptance record per user"],
        note: "A term nobody can prove was shown is a term you do not have — the acceptance record is not optional polish.",
      },
      {
        key: "legal.privacy",
        label: "Privacy Policy",
        path: "legal/privacy",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/legal/documents/privacy", "GET /trust/privacy/register"],
        missing: ["drafted document"],
        note: "Must agree with the art. 30 register field for field. The register is data, so the drafting has a source rather than a memory.",
      },
      {
        key: "legal.cookies",
        label: "Cookie Policy",
        path: "legal/cookies",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/legal/documents/cookies", "GET /trust/consent/categories"],
        missing: ["drafted document"],
      },
      {
        key: "legal.dpa",
        label: "Data Processing Agreement",
        path: "legal/dpa",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/legal/documents/dpa"],
        missing: ["drafted DPA", "countersignature flow"],
        note: "Required before any Belgian business customer's own DPO signs off. BillGen is the processor: the customer's clients' names and addresses are on every invoice.",
      },
      {
        key: "legal.subprocessors",
        label: "Subprocessors",
        path: "legal/subprocessors",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/subprocessors"],
        missing: ["change notification", "verification against signed contracts"],
        note: "Served with an `in_use` flag so a planned provider is never published as a current one. The list in core/trust is assembled from what the repo shows and must be checked against contracts before it is published.",
      },
      {
        key: "legal.ai",
        label: "AI transparency",
        path: "legal/ai-transparency",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/ai-transparency"],
        missing: ["the marker itself, rendered beside every machine-made value"],
        note: "AI-generated output must be identifiable as such — and the duty has been live since 2026-08-02, not 2026-12-02 as this once said. December is the end of a grace period for systems already on the market when the obligation applied; BillGen was not, so it never had one (ADR-0005). One derived date, in core/trust/ai_transparency.py. Nearly free now (the TVA surfaces already carry confidence and wait for a human to confirm) and expensive to retrofit across every AI surface later. Annex III — creditworthiness scoring of a natural person — is the boundary to stay behind: education, never assessment.",
      },
      {
        key: "legal.sla",
        label: "SLA",
        path: "legal/sla",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/legal/documents/sla"],
        missing: ["drafted SLA", "uptime measurement to back it"],
        note: "Do not draft before uptime is measured. /healthz answers a request; it does not accumulate availability.",
      },
      {
        key: "legal.notices",
        label: "Legal notices",
        path: "legal/notices",
        status: "partial",
        layer: "L4",
        endpoints: ["GET /trust/legal/documents/notices"],
        missing: ["legal entity, company number, registered address"],
        note: "Belgian law requires these on the site itself. The cheapest of the seven and the only one already overdue — the pre-sale site is live.",
      },
      {
        key: "legal.contracts",
        label: "Customer contracts",
        path: "legal/contracts",
        status: "none",
        layer: "L2",
        missing: ["Contract model (active/expiring/expired/templates/archived)", "CRUD /contracts"],
        note: "This one is a product feature, not BillGen's own paperwork.",
      },
    ],
  },

  // --------------------------------------------------------------- onboarding
  {
    key: "onboarding",
    label: "Onboarding",
    path: "onboarding",
    status: "partial",
    layer: "L3",
    children: [
      {
        key: "onboarding.wizard",
        label: "Setup wizard",
        path: "onboarding/wizard",
        status: "partial",
        layer: "L3",
        endpoints: ["POST /companies", "POST /clients", "POST /invoices"],
        missing: [
          "onboarding progress persisted per org",
          "resume-where-you-left-off",
          "branding / template steps (no endpoints)",
        ],
        note: "The nine intended steps (activity, company, VAT, bank, numbering, branding, template, first client, first invoice) reduce to one un-resumable CompanyForm today. Steps 6 and 7 have no backend at all.",
      },
    ],
  },

  // ------------------------------------------------------------------ desktop
  {
    key: "desktop",
    label: "Desktop (Windows)",
    path: "desktop",
    status: "partial",
    layer: "L5",
    // surface:"desktop" — these screens need Tauri APIs and a local filesystem,
    // so the SaaS router must not mount them (it did until 2026-08-25, which put
    // five permanently-unreachable pages in the web app). frontend-electron
    // consumes them via routableNodes("desktop").
    surface: "desktop",
    note: "Desktop-only surface: requires the Tauri shell. Excluded from the SaaS router.",
    children: [
      {
        key: "desktop.connection",
        label: "Connection status",
        path: "desktop/connection",
        status: "partial",
        layer: "L5",
        endpoints: ["GET /healthz"],
        missing: ["sync queue", "last-sync timestamp"],
        note: "The desktop build runs its own local SQLite, so 'offline' is currently the only mode — there is nothing to sync with.",
      },
      {
        key: "desktop.offline",
        label: "Offline mode & sync",
        path: "desktop/offline",
        status: "none",
        layer: "L5",
        missing: ["sync protocol", "conflict resolution", "outbox"],
      },
      {
        key: "desktop.backup",
        label: "Automatic local backup",
        path: "desktop/backup",
        status: "partial",
        layer: "L5",
        endpoints: ["GET /backup/export"],
        missing: ["scheduler", "backup folder preference", "retention"],
      },
      {
        key: "desktop.printing",
        label: "Printing & PDF",
        path: "desktop/printing",
        status: "partial",
        layer: "L5",
        endpoints: ["GET /invoices/{id}/pdf"],
        missing: ["default printer preference", "download folder preference", "direct print"],
      },
      {
        key: "desktop.updates",
        label: "Auto-update & crash reporting",
        path: "desktop/updates",
        status: "none",
        layer: "L5",
        missing: ["Tauri updater endpoint", "signing key", "crash reporter"],
        note: "Blocked on EV code-signing (Phase 12).",
      },
    ],
  },
];

// ---------------------------------------------------------------- derivations

/** Depth-first flattening of the whole tree, sections included. */
export function flattenIa(nodes: IaNode[] = IA): IaNode[] {
  return nodes.flatMap((node) => [node, ...flattenIa(node.children ?? [])]);
}

/** Does this node render on the given frontend? A node with no `surface` is
 *  shared; a scoped node renders only on its own surface. */
export function onSurface(node: IaNode, surface: Surface): boolean {
  const nodeSurface = node.surface ?? "both";
  return nodeSurface === "both" || surface === "both" || nodeSurface === surface;
}

/** Sections visible to one frontend, children filtered to match. */
export function iaFor(surface: Surface): IaSection[] {
  return IA.filter((section) => onSurface(section, surface)).map((section) => ({
    ...section,
    children: section.children.filter((child) => onSurface(child, surface)),
  }));
}

/**
 * Every node that owns a route on the given surface.
 *
 * Defaults to "saas" rather than "both" deliberately: the web router is the
 * caller that must never over-mount, so the safe value is the restrictive one.
 * Pass "desktop" from the Tauri shell, or "both" for reporting.
 */
export function routableNodes(surface: Surface = "saas"): IaNode[] {
  return flattenIa(iaFor(surface)).filter((node) => node.path !== undefined);
}

/**
 * Every node the NAV should offer on the given surface.
 *
 * The complement of `routableNodes()`, not a replacement for it: routes,
 * `coverage()`, `missingEndpoints()` and the architecture report keep reading
 * the whole tree, because the ledger has to stay complete (ROADMAP_IA §11b,
 * constraint 2). Only the shells' nav construction calls this.
 */
export function navNodes(surface: Surface = "saas"): IaNode[] {
  return routableNodes(surface).filter(isNavDestination);
}

/** The predicate behind `navNodes`, for callers that already hold the node —
 *  the shells walk sections and children rather than a flat list. One rule,
 *  written once: two spellings of "is this in the nav?" is how a curated nav
 *  and a curated router drift apart. */
export function isNavDestination(node: IaNode): boolean {
  return node.path !== undefined && node.nav !== false;
}

export function findByPath(path: string, surface: Surface = "both"): IaNode | undefined {
  return routableNodes(surface).find((node) => node.path === path);
}

/**
 * Ancestor chain for a routable path, section first, the node itself last.
 *
 * Every screen needs to know where it sits to offer a way back out, and the
 * IA is the only thing that knows. Returns [] for an unknown path rather than
 * throwing: a route that is not in the tree (the invoice builder) simply has
 * no trail, which is the correct answer for an action.
 */
export function iaTrail(path: string, surface: Surface = "saas"): IaNode[] {
  const walk = (nodes: IaNode[], trail: IaNode[]): IaNode[] | undefined => {
    for (const node of nodes) {
      if (!onSurface(node, surface)) continue;
      const here = [...trail, node];
      if (node.path === path) return here;
      const deeper = walk(node.children ?? [], here);
      if (deeper) return deeper;
    }
    return undefined;
  };
  return walk(IA, []) ?? [];
}

export interface IaCoverage {
  wired: number;
  partial: number;
  none: number;
  total: number;
  /** Percentage of leaf nodes that are fully wired. */
  percent: number;
}

/** Coverage over LEAF nodes only — sections would otherwise be double-counted.
 *  Pass `iaFor("saas")` to measure just the web product. */
export function coverage(nodes: IaNode[] = IA): IaCoverage {
  const leaves = flattenIa(nodes).filter((node) => !node.children?.length);
  const wired = leaves.filter((n) => n.status === "wired").length;
  const partial = leaves.filter((n) => n.status === "partial").length;
  const none = leaves.filter((n) => n.status === "none").length;
  const total = leaves.length;
  return {
    wired,
    partial,
    none,
    total,
    percent: total === 0 ? 0 : Math.round((wired / total) * 100),
  };
}

/** Deduplicated list of everything the server would still have to grow. */
export function missingEndpoints(): string[] {
  const all = flattenIa().flatMap((node) => node.missing ?? []);
  return [...new Set(all)].sort();
}
