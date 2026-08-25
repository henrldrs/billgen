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
 *  Endpoint inventory this was checked against (api/routers/, 2026-08-25):
 *    /auth/{signup,login,refresh,logout,desktop-bootstrap}  /users/me
 *    /orgs/current  /companies[POST,GET]  /clients[POST,GET,GET id,PATCH]
 *    /products[POST,GET,GET id,PATCH]
 *    /invoices[POST,GET?company_id&status,GET id,POST id/issue,DELETE id,
 *              POST id/void,POST preview,GET id/html,GET id/pdf,
 *              GET id/peppol.xml]
 *    /credit-notes[POST,GET,GET id,GET id/html,GET id/pdf]
 *    /payments[POST,GET?invoice_id]  /reports/{kpi,revenue}
 *    /activity?limit&target_type  /backup/{export,restore}
 *    /imports/legacy/{preview,commit}  /healthz  /readyz
 */

export type BackendStatus = "wired" | "partial" | "none";

/** Which of the six roadmap layers a node belongs to (see docs/ROADMAP_IA.md). */
export type Layer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

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
        missing: ["GET /alerts"],
        note: "Needs a server-side rules engine (overdue, incomplete clients, plan limits). Cannot be faked from /reports/kpi.",
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
        status: "partial",
        layer: "L2",
        endpoints: [
          "GET /invoices/{id}",
          "GET /invoices/{id}/pdf",
          "GET /invoices/{id}/peppol.xml",
          "GET /payments?invoice_id",
          "POST /payments",
        ],
        missing: [
          "GET /activity?target_id (per-invoice timeline)",
          "POST /invoices/{id}/send",
          "POST /invoices/{id}/duplicate",
        ],
        note: "Header, totals, payments and exports are real. The status timeline can only show created/issued/paid — /activity filters by target_type, not target_id, so a true per-invoice history is unavailable.",
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
        missing: [
          "Quote model + numbering series",
          "CRUD /quotes",
          "POST /quotes/{id}/convert-to-invoice",
          "PDF template",
        ],
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
        status: "partial",
        layer: "L2",
        endpoints: ["GET /clients/{id}", "GET /invoices?company_id"],
        missing: [
          "GET /clients/{id}/stats",
          "GET /invoices?client_id",
          "GET /activity?target_id",
        ],
        note: "Overview totals are computed client-side by filtering the whole invoice list — correct but unscalable. Quotes and Documents tabs have no backend at all.",
      },
      {
        key: "customers.contacts",
        label: "Contacts",
        path: "customers/contacts",
        status: "none",
        layer: "L2",
        missing: ["Contact model (many per client)", "CRUD /contacts"],
        note: "Client currently carries one flat email/phone. Multiple named contacts is a schema change.",
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
        status: "partial",
        layer: "L2",
        endpoints: ["GET /activity"],
        missing: ["GET /activity?target_id"],
        note: "The audit log is real but cannot be scoped to one client.",
      },
      {
        key: "customers.documents",
        label: "Client documents",
        path: "customers/documents",
        status: "none",
        layer: "L2",
        missing: ["blob storage", "Document model", "CRUD /documents"],
      },
      {
        key: "customers.activity",
        label: "Client activity",
        path: "customers/activity",
        status: "partial",
        layer: "L2",
        endpoints: ["GET /activity?target_type=client"],
        missing: ["GET /activity?target_id"],
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
        endpoints: ["GET /products"],
        missing: ["GET /products?billing_type", "a product/service discriminator"],
        note: "Product.billing_type (hourly/fixed/daily/unit/recurring) makes the split derivable, but the server cannot filter on it — the UI filters after fetching everything.",
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
        status: "none",
        layer: "L2",
        missing: ["GET /vat-rates"],
        note: "core/rules/vat.py holds the Belgian logic but never exposes it — the frontend hardcodes 21/12/6/0.",
      },
      {
        key: "catalog.templates",
        label: "Invoice templates",
        path: "catalog/templates",
        status: "none",
        layer: "L2",
        missing: ["GET /pdf-templates"],
        note: "core/pdf/registry.TEMPLATES has four templates (fr_standard, fr_detailed, nl_minimal, credit_note); no endpoint lists them, so the picker cannot be populated.",
      },
      {
        key: "catalog.archived",
        label: "Archived",
        path: "catalog/archived",
        status: "partial",
        layer: "L2",
        endpoints: ["GET /products"],
        missing: ["GET /products?status=archived"],
        note: "ProductStatus.ARCHIVED exists on the model; the list endpoint takes no status filter.",
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
        status: "partial",
        layer: "L2",
        endpoints: ["GET /invoices"],
        missing: ["GET /reports/invoices (aggregated)"],
        note: "Counts are aggregated in the browser from the full list.",
      },
      {
        key: "reports.payments",
        label: "Payments",
        path: "reports/payments",
        status: "none",
        layer: "L2",
        missing: ["GET /payments (global, unscoped)"],
        note: "/payments requires an invoice_id — there is no way to list payments across invoices.",
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
        status: "none",
        layer: "L2",
        missing: ["GET /reports/vat?period"],
        note: "The Belgian VAT return is the single most valuable report for the target user and nothing on the server computes it.",
      },
      {
        key: "reports.clients",
        label: "Clients",
        path: "reports/clients",
        status: "none",
        layer: "L2",
        missing: ["GET /reports/clients"],
      },
      {
        key: "reports.products",
        label: "Products & services",
        path: "reports/products",
        status: "none",
        layer: "L2",
        missing: ["GET /reports/products"],
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
    children: [
      {
        key: "company.profile",
        label: "Company profile",
        path: "company/profile",
        status: "partial",
        layer: "L1",
        endpoints: ["GET /companies", "POST /companies"],
        missing: ["PATCH /companies/{id}", "GET /companies/{id}"],
        note: "THE headline API gap: a company can be created but never edited. Every field below exists on the model and is unreachable after creation.",
      },
      {
        key: "company.legal",
        label: "Legal information",
        path: "company/legal",
        status: "partial",
        layer: "L1",
        endpoints: ["POST /companies"],
        missing: ["PATCH /companies/{id}"],
        note: "Company.legal_name and registration_number exist on the model; write-once only.",
      },
      {
        key: "company.vat",
        label: "VAT / BCE information",
        path: "company/vat",
        status: "partial",
        layer: "L1",
        endpoints: ["POST /companies"],
        missing: ["PATCH /companies/{id}", "GET /companies/{id}/vat-validation"],
        note: "Company.vat_number exists and core/rules/identifiers.py can validate it, but no endpoint offers validation.",
      },
      {
        key: "company.bank",
        label: "Bank accounts",
        path: "company/bank",
        status: "partial",
        layer: "L1",
        endpoints: ["POST /companies"],
        missing: ["PATCH /companies/{id}", "BankAccount model (many per company)"],
        note: "Company.iban/bic hold exactly one account.",
      },
      {
        key: "company.numbering",
        label: "Invoice numbering",
        path: "company/numbering",
        status: "partial",
        layer: "L1",
        endpoints: ["POST /companies"],
        missing: ["PATCH /companies/{id}", "GET /sequences"],
        note: "Company.invoice_reference_prefix exists; the next-number counter in sequence_repo is not readable.",
      },
      {
        key: "company.payment-terms",
        label: "Payment conditions",
        path: "company/payment-terms",
        status: "none",
        layer: "L2",
        missing: ["payment_terms_days on Company", "late-fee configuration"],
      },
      {
        key: "company.branding",
        label: "Branding",
        path: "company/branding",
        status: "none",
        layer: "L2",
        missing: ["POST /companies/{id}/logo", "blob storage", "brand colour fields"],
        note: "Company.logo_key is a dangling reference — nothing uploads or serves a logo.",
      },
      {
        key: "company.defaults",
        label: "Invoice defaults",
        path: "company/defaults",
        status: "partial",
        layer: "L2",
        endpoints: ["POST /companies"],
        missing: ["PATCH /companies/{id}", "default notes / payment instructions fields"],
        note: "default_currency, default_language and default_pdf_template exist; notes and payment instructions do not.",
      },
      {
        key: "company.documents",
        label: "Company documents",
        path: "company/documents",
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
    status: "none",
    layer: "L3",
    note: "Phase 10. Nothing on the server knows what a plan is.",
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
        status: "none",
        layer: "L3",
        missing: ["Plan model", "GET /billing/plans"],
      },
      {
        key: "billing.usage",
        label: "Usage",
        path: "billing/usage",
        status: "none",
        layer: "L3",
        missing: ["GET /billing/usage", "metering (invoices, clients, storage, seats)"],
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
        missing: ["GET /search?q (cross-entity)"],
        note: "The ⌘K palette navigates between pages; it cannot find an invoice by number or a client by VAT.",
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
        status: "partial",
        layer: "L4",
        endpoints: ["GET /activity"],
        missing: ["GET /activity?actor_user_id"],
        note: "Entries carry an actor but cannot be filtered by one.",
      },
      {
        key: "activity.security",
        label: "Security events",
        path: "activity/security",
        status: "none",
        layer: "L4",
        missing: ["security event stream (logins, failures, token revocations)"],
      },
      {
        key: "activity.system",
        label: "System events",
        path: "activity/system",
        status: "none",
        layer: "L4",
        missing: ["GET /system/events"],
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
        note: "OrgMembership exists in core/models but is not exposed and carries no role enum.",
      },
      {
        key: "settings.security",
        label: "Security",
        path: "settings/security",
        status: "none",
        layer: "L4",
        missing: [
          "POST /auth/password (change)",
          "TOTP enrolment",
          "GET/DELETE /auth/sessions",
          "login history",
        ],
        note: "Refresh tokens exist server-side but are not listable or revocable one by one.",
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
        endpoints: ["GET /backup/export"],
        missing: [
          "GET /privacy/personal-data",
          "POST /privacy/export (structured GDPR export)",
          "POST /privacy/delete-account",
          "consent records",
          "processing register",
          "subprocessor list",
        ],
        note: "/backup/export is an org backup, not a GDPR subject-access export, and there is no account-deletion workflow.",
      },
      {
        key: "settings.cookies",
        label: "Cookie preferences",
        path: "settings/cookies",
        status: "none",
        layer: "L4",
        missing: ["consent storage", "analytics/marketing categories"],
        note: "Currently no analytics run at all, which is the only reason this is not already a compliance problem.",
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
        endpoints: ["POST /companies (default_language)"],
        missing: ["PATCH /companies/{id}", "per-user language", "timezone", "number/date format"],
        note: "Language follows the company and cannot be changed after creation; there is no user-level preference.",
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
    status: "none",
    layer: "L4",
    note: "BillGen's own legal framework — distinct from customer contracts below.",
    children: [
      {
        key: "legal.tos",
        label: "Terms of Service",
        path: "legal/terms",
        status: "none",
        layer: "L4",
        missing: ["drafted document", "version + acceptance record per user"],
      },
      {
        key: "legal.privacy",
        label: "Privacy Policy",
        path: "legal/privacy",
        status: "none",
        layer: "L4",
        missing: ["drafted document"],
      },
      {
        key: "legal.cookies",
        label: "Cookie Policy",
        path: "legal/cookies",
        status: "none",
        layer: "L4",
        missing: ["drafted document"],
      },
      {
        key: "legal.dpa",
        label: "Data Processing Agreement",
        path: "legal/dpa",
        status: "none",
        layer: "L4",
        missing: ["drafted DPA", "countersignature flow"],
        note: "Required before any Belgian business customer's own DPO signs off.",
      },
      {
        key: "legal.subprocessors",
        label: "Subprocessors",
        path: "legal/subprocessors",
        status: "none",
        layer: "L4",
        missing: ["maintained list", "change notification"],
      },
      {
        key: "legal.sla",
        label: "SLA",
        path: "legal/sla",
        status: "none",
        layer: "L4",
        missing: ["drafted SLA", "uptime measurement to back it"],
      },
      {
        key: "legal.notices",
        label: "Legal notices",
        path: "legal/notices",
        status: "none",
        layer: "L4",
        missing: ["legal entity, company number, registered address"],
        note: "Belgian law requires these on the site itself.",
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
    note: "Only reachable in the Tauri shell; shown here so the surface is not forgotten.",
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

/** Every node that owns a route, keyed by path. */
export function routableNodes(): IaNode[] {
  return flattenIa().filter((node) => node.path !== undefined);
}

export function findByPath(path: string): IaNode | undefined {
  return routableNodes().find((node) => node.path === path);
}

export interface IaCoverage {
  wired: number;
  partial: number;
  none: number;
  total: number;
  /** Percentage of leaf nodes that are fully wired. */
  percent: number;
}

/** Coverage over LEAF nodes only — sections would otherwise be double-counted. */
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
