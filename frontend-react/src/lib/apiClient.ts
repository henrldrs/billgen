/** Typed HTTP client for the BillGen API.
 *
 * Token storage is pluggable (TokenStore) so the SaaS shell can persist to
 * whatever it chooses and the desktop shell to its own store — the UI kit
 * itself never touches window.localStorage.
 *
 * A 401 on a protected call triggers exactly one refresh + retry; if the
 * refresh fails, tokens are cleared and onAuthLost fires. */

import type {
  TemplateCreateRequest,
  TemplateResponse,
  TemplateUpdateRequest,
  ActivityEntryResponse,
  ClientCreateRequest,
  ClientResponse,
  ClientStatsResponse,
  ClientUpdateRequest,
  CompanyCreateRequest,
  CompanyResponse,
  CompanyUpdateRequest,
  CompanyValidationResponse,
  CreditNoteIssueRequest,
  CreditNoteResponse,
  EntitlementsResponse,
  ImportReport,
  InvoiceCreateRequest,
  InvoicePreviewRequest,
  InvoicePreviewResponse,
  InvoiceReportResponse,
  InvoiceResponse,
  IssueRequest,
  KpiResponse,
  LoginRequest,
  LoginResponse,
  OrganizationResponse,
  PaymentCreateRequest,
  PaymentRecordResponse,
  PaymentReportResponse,
  PaymentResponse,
  PdfTemplatesResponse,
  PlansResponse,
  ProductCreateRequest,
  ProductResponse,
  ProductUpdateRequest,
  RevenueByMonthResponse,
  SearchResponse,
  SignupRequest,
  SignupResponse,
  TimelineEventResponse,
  TokenResponse,
  UserMeResponse,
  VatRatesResponse,
  VatReportResponse,
} from "../types";

/** Runtime shape of POST /backup/restore's response. Hand-typed: the backup
 *  endpoints aren't in the generated api.d.ts yet — replace on regeneration. */
export interface RestoreReport {
  companies: number;
  clients: number;
  products: number;
  invoices: number;
  credit_notes: number;
  payments: number;
  sequences: number;
  audit_entries: number;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface TokenStore {
  getAccess(): string | null;
  getRefresh(): string | null;
  set(tokens: Tokens): void;
  clear(): void;
}

export class MemoryTokenStore implements TokenStore {
  private access: string | null = null;
  private refresh: string | null = null;

  getAccess() {
    return this.access;
  }
  getRefresh() {
    return this.refresh;
  }
  set(tokens: Tokens) {
    this.access = tokens.access_token;
    this.refresh = tokens.refresh_token;
  }
  clear() {
    this.access = null;
    this.refresh = null;
  }
}

/** One entry of a structured validation error (e.g. the Peppol export gate). */
export interface ApiFieldError {
  field: string;
  message_key: string;
}

/** The body behind a 402. One shape for every commercial refusal, so the shell
 *  needs a single handler and no per-feature payment logic. */
export interface EntitlementFailure {
  /** `entitlement_required` = the plan lacks the capability outright.
   *  `usage_limit_reached` = the plan has it and the allowance is spent. */
  error: "entitlement_required" | "usage_limit_reached";
  /** The cheapest plan that would allow it, for the upgrade prompt. */
  required_tier: string | null;
  /** Capability name or meter name (`companies`, `invoices`, …). */
  feature: string;
  message: string;
  limit?: number;
  used?: number;
  period?: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly errors: ApiFieldError[];
  /** Present only on 402. See `isEntitlementError`. */
  readonly entitlement?: EntitlementFailure;

  constructor(
    status: number,
    detail: string,
    errors: ApiFieldError[] = [],
    entitlement?: EntitlementFailure,
  ) {
    super(`API ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
    this.errors = errors;
    this.entitlement = entitlement;
  }
}

/** True when the server refused for a *commercial* reason — the one case that
 *  should open an upgrade prompt. A 403 must never land here: that means
 *  authenticated but not authorized, which is a different conversation. */
export function isEntitlementError(
  error: unknown,
): error is ApiError & { entitlement: EntitlementFailure } {
  return error instanceof ApiError && error.status === 402 && error.entitlement !== undefined;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens?: TokenStore;
  onAuthLost?: () => void;
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  auth?: boolean;
  blob?: boolean;
}

export class ApiClient {
  readonly baseUrl: string;
  readonly tokens: TokenStore;
  private readonly onAuthLost?: () => void;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.tokens = options.tokens ?? new MemoryTokenStore();
    this.onAuthLost = options.onAuthLost;
    // bind: calling an unbound `fetch` through an instance property rebinds
    // `this` and throws "Illegal invocation" in browsers (fine in Node).
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  private async rawRequest(
    method: string,
    path: string,
    body: unknown,
    withAuth: boolean,
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (withAuth) {
      const access = this.tokens.getAccess();
      if (access) headers["Authorization"] = `Bearer ${access}`;
    }
    return this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async tryRefresh(): Promise<boolean> {
    const refresh = this.tokens.getRefresh();
    if (!refresh) return false;
    const response = await this.rawRequest(
      "POST",
      "/auth/refresh",
      { refresh_token: refresh },
      false,
    );
    if (!response.ok) {
      this.tokens.clear();
      this.onAuthLost?.();
      return false;
    }
    const tokens = (await response.json()) as TokenResponse;
    this.tokens.set(tokens);
    return true;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const withAuth = options.auth !== false;
    let response = await this.rawRequest(method, path, body, withAuth);

    if (response.status === 401 && withAuth && (await this.tryRefresh())) {
      response = await this.rawRequest(method, path, body, withAuth);
    }

    if (!response.ok) {
      let detail = response.statusText;
      let errors: ApiFieldError[] = [];
      let entitlement: EntitlementFailure | undefined;
      try {
        const parsed = (await response.json()) as {
          detail?: unknown;
          errors?: unknown;
          error?: unknown;
          feature?: unknown;
          message?: unknown;
        };
        if (typeof parsed.detail === "string") detail = parsed.detail;
        // A 402 body has no `detail`; it carries the entitlement failure
        // directly, which the shell turns into an upgrade prompt.
        if (
          response.status === 402 &&
          (parsed.error === "entitlement_required" ||
            parsed.error === "usage_limit_reached")
        ) {
          entitlement = parsed as unknown as EntitlementFailure;
          if (typeof parsed.message === "string") detail = parsed.message;
        }
        if (Array.isArray(parsed.errors)) {
          errors = parsed.errors.filter(
            (e): e is ApiFieldError =>
              typeof e === "object" &&
              e !== null &&
              typeof (e as ApiFieldError).field === "string" &&
              typeof (e as ApiFieldError).message_key === "string",
          );
        }
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(response.status, detail, errors, entitlement);
    }

    if (response.status === 204) return undefined as T;
    if (options.blob) return (await response.blob()) as T;
    return (await response.json()) as T;
  }

  // ---- auth ----------------------------------------------------------------

  async signup(body: SignupRequest): Promise<SignupResponse> {
    const result = await this.request<SignupResponse>("POST", "/auth/signup", body, {
      auth: false,
    });
    this.tokens.set(result.tokens);
    return result;
  }

  async login(body: LoginRequest): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>("POST", "/auth/login", body, {
      auth: false,
    });
    this.tokens.set(result.tokens);
    return result;
  }

  /** Desktop build only: mint a local single-user session (404 on hosted API). */
  async desktopBootstrap(): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>(
      "POST",
      "/auth/desktop-bootstrap",
      undefined,
      { auth: false },
    );
    this.tokens.set(result.tokens);
    return result;
  }

  async logout(): Promise<void> {
    const refresh = this.tokens.getRefresh();
    if (refresh) {
      await this.request<void>("POST", "/auth/logout", { refresh_token: refresh }, {
        auth: false,
      });
    }
    this.tokens.clear();
  }

  me(): Promise<UserMeResponse> {
    return this.request("GET", "/users/me");
  }

  currentOrganization(): Promise<OrganizationResponse> {
    return this.request("GET", "/orgs/current");
  }

  // ---- companies -----------------------------------------------------------

  listCompanies(): Promise<CompanyResponse[]> {
    return this.request("GET", "/companies");
  }

  createCompany(body: CompanyCreateRequest): Promise<CompanyResponse> {
    return this.request("POST", "/companies", body);
  }

  getCompany(companyId: string): Promise<CompanyResponse> {
    return this.request("GET", `/companies/${companyId}`);
  }

  /** PATCH semantics: only the fields you send change. `logo_key` is not
   *  editable here — it belongs to blob storage (B2), which does not exist. */
  updateCompany(companyId: string, body: CompanyUpdateRequest): Promise<CompanyResponse> {
    return this.request("PATCH", `/companies/${companyId}`, body);
  }

  /** Per-field verdict on this company's VAT / IBAN / BIC, plus what is still
   *  missing before it could act as a Peppol supplier. Supplier side only: a
   *  `peppol_ready` company can still be refused at export time because the
   *  *client* fails the gate (no VAT number = B2C, which Peppol must not carry). */
  validateCompany(companyId: string): Promise<CompanyValidationResponse> {
    return this.request("GET", `/companies/${companyId}/validation`);
  }

  // ---- clients ---------------------------------------------------------------

  listClients(companyId?: string): Promise<ClientResponse[]> {
    const query = companyId ? `?company_id=${companyId}` : "";
    return this.request("GET", `/clients${query}`);
  }

  getClient(clientId: string): Promise<ClientResponse> {
    return this.request("GET", `/clients/${clientId}`);
  }

  createClient(body: ClientCreateRequest): Promise<ClientResponse> {
    return this.request("POST", "/clients", body);
  }

  updateClient(clientId: string, body: ClientUpdateRequest): Promise<ClientResponse> {
    return this.request("PATCH", `/clients/${clientId}`, body);
  }

  /** Client 360's header numbers in one call — invoiced, paid, outstanding,
   *  overdue, credited, and average days to payment. */
  clientStats(clientId: string, today?: string): Promise<ClientStatsResponse> {
    const query = today ? `?today=${today}` : "";
    return this.request("GET", `/clients/${clientId}/stats${query}`);
  }

  /** The commercial history — invoices, credit notes and payments, newest
   *  first. Distinct from `activity({ targetId })`, which is the audit log and
   *  only ever returns edits to the client record itself. */
  clientTimeline(clientId: string, limit?: number): Promise<TimelineEventResponse[]> {
    const query = limit ? `?limit=${limit}` : "";
    return this.request("GET", `/clients/${clientId}/timeline${query}`);
  }

  // ---- products --------------------------------------------------------------

  /** Edit your own profile. Both fields optional — the language toggle sends
   *  only `language`, and the profile form only `display_name`. */
  updateMe(body: { display_name?: string; language?: string }): Promise<UserMeResponse> {
    return this.request("PATCH", "/users/me", body);
  }

  /** Move the local dev organization onto a tier.
   *
   *  404s unless the API was started with desktop_mode. There is no checkout
   *  yet (the deferred half of B4), so this is the only way to exercise the
   *  entitlement layer — and it is a dev affordance, not a product one.
   */
  setDesktopPlanTier(tier: string): Promise<{ plan_tier: string }> {
    return this.request("POST", "/desktop/plan-tier", { plan_tier: tier });
  }

  // ---- document templates (Business tier and above) ------------------------
  //
  // Reads are open to every tier: an organization that downgrades keeps the
  // templates it built and the screen shows them with an upgrade prompt. Every
  // write answers 402 below Business, whatever the UI rendered.

  listTemplates(companyId?: string, docType?: string): Promise<TemplateResponse[]> {
    const params = new URLSearchParams();
    if (companyId) params.set("company_id", companyId);
    if (docType) params.set("doc_type", docType);
    const query = params.toString();
    return this.request("GET", `/templates${query ? `?${query}` : ""}`);
  }

  getTemplate(templateId: string): Promise<TemplateResponse> {
    return this.request("GET", `/templates/${templateId}`);
  }

  createTemplate(body: TemplateCreateRequest): Promise<TemplateResponse> {
    return this.request("POST", "/templates", body);
  }

  updateTemplate(templateId: string, body: TemplateUpdateRequest): Promise<TemplateResponse> {
    return this.request("PATCH", `/templates/${templateId}`, body);
  }

  publishTemplate(templateId: string): Promise<TemplateResponse> {
    return this.request("POST", `/templates/${templateId}/publish`, {});
  }

  setDefaultTemplate(templateId: string): Promise<TemplateResponse> {
    return this.request("POST", `/templates/${templateId}/default`, {});
  }

  deleteTemplate(templateId: string): Promise<void> {
    return this.request("DELETE", `/templates/${templateId}`);
  }

  listProducts(
    companyIdOrParams?: string | { companyId?: string; status?: string; billingType?: string },
  ): Promise<ProductResponse[]> {
    const params =
      typeof companyIdOrParams === "string"
        ? { companyId: companyIdOrParams }
        : (companyIdOrParams ?? {});
    const search = new URLSearchParams();
    if (params.companyId) search.set("company_id", params.companyId);
    // Catalog's Services and Archived views: the server filters, so the browser
    // stops downloading the whole catalog to hide most of it.
    if (params.status) search.set("status", params.status);
    if (params.billingType) search.set("billing_type", params.billingType);
    const query = search.size > 0 ? `?${search}` : "";
    return this.request("GET", `/products${query}`);
  }

  createProduct(body: ProductCreateRequest): Promise<ProductResponse> {
    return this.request("POST", "/products", body);
  }

  updateProduct(productId: string, body: ProductUpdateRequest): Promise<ProductResponse> {
    return this.request("PATCH", `/products/${productId}`, body);
  }

  // ---- invoices --------------------------------------------------------------

  previewInvoice(body: InvoicePreviewRequest): Promise<InvoicePreviewResponse> {
    return this.request("POST", "/invoices/preview", body);
  }

  createInvoice(body: InvoiceCreateRequest): Promise<InvoiceResponse> {
    return this.request("POST", "/invoices", body);
  }

  listInvoices(params?: {
    companyId?: string;
    status?: string;
    clientId?: string;
  }): Promise<InvoiceResponse[]> {
    const search = new URLSearchParams();
    if (params?.companyId) search.set("company_id", params.companyId);
    if (params?.status) search.set("status", params.status);
    if (params?.clientId) search.set("client_id", params.clientId);
    const query = search.size > 0 ? `?${search}` : "";
    return this.request("GET", `/invoices${query}`);
  }

  getInvoice(invoiceId: string): Promise<InvoiceResponse> {
    return this.request("GET", `/invoices/${invoiceId}`);
  }

  /** Issue a draft: consumes the gapless number and finalizes it (ISSUED). */
  issueInvoice(invoiceId: string, body?: IssueRequest): Promise<InvoiceResponse> {
    return this.request("POST", `/invoices/${invoiceId}/issue`, body ?? {});
  }

  /** Hard-delete a DRAFT invoice. 409 if it has already been issued. */
  deleteInvoice(invoiceId: string): Promise<void> {
    return this.request("DELETE", `/invoices/${invoiceId}`);
  }

  /** Copy an invoice into a new DRAFT dated today. No number is consumed and
   *  nothing on the source changes — including an issued or voided source. */
  duplicateInvoice(invoiceId: string): Promise<InvoiceResponse> {
    return this.request("POST", `/invoices/${invoiceId}/duplicate`);
  }

  voidInvoice(invoiceId: string, reason: string): Promise<InvoiceResponse> {
    return this.request("POST", `/invoices/${invoiceId}/void`, { reason });
  }

  invoiceHtml(invoiceId: string, template?: string): Promise<string> {
    const query = template ? `?template=${template}` : "";
    return this.request<Blob>("GET", `/invoices/${invoiceId}/html${query}`, undefined, {
      blob: true,
    }).then((blob) => blob.text());
  }

  invoicePdf(invoiceId: string, template?: string): Promise<Blob> {
    const query = template ? `?template=${template}` : "";
    return this.request("GET", `/invoices/${invoiceId}/pdf${query}`, undefined, {
      blob: true,
    });
  }

  invoicePeppolXml(invoiceId: string): Promise<Blob> {
    return this.request("GET", `/invoices/${invoiceId}/peppol.xml`, undefined, {
      blob: true,
    });
  }

  // ---- credit notes ----------------------------------------------------------

  issueCreditNote(body: CreditNoteIssueRequest): Promise<CreditNoteResponse> {
    return this.request("POST", "/credit-notes", body);
  }

  listCreditNotes(companyId?: string): Promise<CreditNoteResponse[]> {
    const query = companyId ? `?company_id=${companyId}` : "";
    return this.request("GET", `/credit-notes${query}`);
  }

  creditNotePdf(creditNoteId: string): Promise<Blob> {
    return this.request("GET", `/credit-notes/${creditNoteId}/pdf`, undefined, {
      blob: true,
    });
  }

  // ---- payments --------------------------------------------------------------

  recordPayment(body: PaymentCreateRequest): Promise<PaymentRecordResponse> {
    return this.request("POST", "/payments", body);
  }

  listPayments(
    invoiceIdOrParams:
      | string
      | {
          invoiceId?: string;
          companyId?: string;
          clientId?: string;
          /** Inclusive. */
          paidFrom?: string;
          /** Inclusive. */
          paidTo?: string;
        },
  ): Promise<PaymentResponse[]> {
    const params =
      typeof invoiceIdOrParams === "string"
        ? { invoiceId: invoiceIdOrParams }
        : invoiceIdOrParams;
    const search = new URLSearchParams();
    if (params.invoiceId) search.set("invoice_id", params.invoiceId);
    if (params.companyId) search.set("company_id", params.companyId);
    if (params.clientId) search.set("client_id", params.clientId);
    if (params.paidFrom) search.set("paid_from", params.paidFrom);
    if (params.paidTo) search.set("paid_to", params.paidTo);
    const query = search.size > 0 ? `?${search}` : "";
    return this.request("GET", `/payments${query}`);
  }

  // ---- imports -----------------------------------------------------------------

  /** Dry run: what would a legacy backup import create/skip? Writes nothing. */
  previewLegacyImport(backup: unknown): Promise<ImportReport> {
    return this.request("POST", "/imports/legacy/preview", backup);
  }

  /** Import a legacy backup into the current org. Idempotent (dedup by name). */
  commitLegacyImport(backup: unknown): Promise<ImportReport> {
    return this.request("POST", "/imports/legacy/commit", backup);
  }

  // ---- backup (ADR-0003) ---------------------------------------------------------

  /** The whole organization as a restorable JSON document (never includes
   *  users/credentials). Writes one export_backup audit entry server-side. */
  exportBackup(): Promise<unknown> {
    return this.request("GET", "/backup/export");
  }

  /** Disaster recovery: restore a backup into the current (empty) org.
   *  409 if the org already has companies or the file isn't a valid backup. */
  restoreBackup(backup: unknown): Promise<RestoreReport> {
    return this.request("POST", "/backup/restore", backup);
  }

  // ---- reports & activity ------------------------------------------------------

  kpi(companyId: string, today?: string): Promise<KpiResponse> {
    const query = today ? `&today=${today}` : "";
    return this.request("GET", `/reports/kpi?company_id=${companyId}${query}`);
  }

  revenue(companyId: string, year: number): Promise<RevenueByMonthResponse> {
    return this.request("GET", `/reports/revenue?company_id=${companyId}&year=${year}`);
  }

  activity(params?: {
    limit?: number;
    targetType?: string;
    /** Scope the log to one record — a client, an invoice. */
    targetId?: string;
  }): Promise<ActivityEntryResponse[]> {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.targetType) search.set("target_type", params.targetType);
    if (params?.targetId) search.set("target_id", params.targetId);
    const query = search.size > 0 ? `?${search}` : "";
    return this.request("GET", `/activity${query}`);
  }

  // ---- reports (aggregations the browser used to do itself) --------------------

  /** Counts and money per effective status, plus a monthly series. Replaces
   *  fetching every invoice and grouping it client-side. `period` is a year
   *  (`2026`), a quarter (`2026-Q3`) or a month (`2026-07`); omit for all time. */
  invoiceReport(
    companyId: string,
    params?: { period?: string; today?: string },
  ): Promise<InvoiceReportResponse> {
    const search = new URLSearchParams({ company_id: companyId });
    if (params?.period) search.set("period", params.period);
    if (params?.today) search.set("today", params.today);
    return this.request("GET", `/reports/invoices?${search}`);
  }

  /** Cash in, totalled by the server rather than by the browser.
   *
   *  Filter by `period` (a named window) OR by `paidFrom`/`paidTo` (the same
   *  window `listPayments` takes) — not both; the server answers 422 rather
   *  than picking one silently. The explicit pair is what lets a screen print
   *  the total of exactly the rows it is showing.
   *
   *  Amounts are the company's default currency; payments in any other are
   *  counted in `skipped_other_currency` instead of being summed at face
   *  value, so a mixed-currency window is visibly incomplete rather than
   *  quietly wrong. */
  paymentReport(
    companyId: string,
    params?: { period?: string; clientId?: string; paidFrom?: string; paidTo?: string },
  ): Promise<PaymentReportResponse> {
    const search = new URLSearchParams({ company_id: companyId });
    if (params?.period) search.set("period", params.period);
    if (params?.clientId) search.set("client_id", params.clientId);
    if (params?.paidFrom) search.set("paid_from", params.paidFrom);
    if (params?.paidTo) search.set("paid_to", params.paidTo);
    return this.request("GET", `/reports/payments?${search}`);
  }

  /** Output VAT per (category, rate) for one declaration period.
   *  Sales only — the response carries `covers: "output_vat_only"` and must
   *  never be presented as a return that is ready to file. */
  vatReport(companyId: string, period: string): Promise<VatReportResponse> {
    const search = new URLSearchParams({ company_id: companyId, period });
    return this.request("GET", `/reports/vat?${search}`);
  }

  // ---- search ----------------------------------------------------------------------

  /** One term across invoices, quotes, credit notes, clients and products.
   *
   *  The server escapes LIKE metacharacters, so a typed `%` is a literal and
   *  not a request for every row. A term shorter than two characters comes
   *  back empty rather than as a 422: the palette fires on every keystroke and
   *  the caller is mid-word, which is not an error worth rendering.
   *
   *  `truncated` is set when any kind hit `limit`, so a caller can say "more"
   *  rather than implying it showed everything. */
  search(q: string, limit?: number): Promise<SearchResponse> {
    const search = new URLSearchParams({ q });
    if (limit !== undefined) search.set("limit", String(limit));
    return this.request("GET", `/search?${search}`);
  }

  // ---- entitlements --------------------------------------------------------------

  /** What this tenant's plan allows, and how much of each allowance is spent.
   *  Read once on boot to render the UI correctly. **Not** the enforcement
   *  point — every gated endpoint re-checks and answers 402. */
  entitlements(): Promise<EntitlementsResponse> {
    return this.request("GET", "/entitlements");
  }

  /** The whole commercial matrix, for a pricing or upgrade screen. Served from
   *  the server's table so there is no second copy to keep in sync. */
  plans(): Promise<PlansResponse> {
    return this.request("GET", "/plans");
  }

  // ---- reference data ------------------------------------------------------------

  /** The Belgian rates and EN 16931 categories, from core/rules/vat.py.
   *  Use this instead of hardcoding 21/12/6/0. */
  vatRates(): Promise<VatRatesResponse> {
    return this.request("GET", "/vat-rates");
  }

  /** The PDF templates the server can actually render, from core/pdf/registry. */
  pdfTemplates(): Promise<PdfTemplatesResponse> {
    return this.request("GET", "/pdf-templates");
  }
}
