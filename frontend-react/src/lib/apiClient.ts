/** Typed HTTP client for the BillGen API.
 *
 * Token storage is pluggable (TokenStore) so the SaaS shell can persist to
 * whatever it chooses and the desktop shell to its own store — the UI kit
 * itself never touches window.localStorage.
 *
 * A 401 on a protected call triggers exactly one refresh + retry; if the
 * refresh fails, tokens are cleared and onAuthLost fires. */

import type {
  ActivityEntryResponse,
  ClientCreateRequest,
  ClientResponse,
  ClientUpdateRequest,
  CompanyCreateRequest,
  CompanyResponse,
  CreditNoteIssueRequest,
  CreditNoteResponse,
  ImportReport,
  InvoiceCreateRequest,
  InvoicePreviewRequest,
  InvoicePreviewResponse,
  InvoiceResponse,
  IssueRequest,
  KpiResponse,
  LoginRequest,
  LoginResponse,
  OrganizationResponse,
  PaymentCreateRequest,
  PaymentRecordResponse,
  PaymentResponse,
  ProductCreateRequest,
  ProductResponse,
  ProductUpdateRequest,
  RevenueByMonthResponse,
  SignupRequest,
  SignupResponse,
  TokenResponse,
  UserMeResponse,
} from "../types";

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

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`API ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
  }
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
      try {
        const parsed = (await response.json()) as { detail?: unknown };
        if (typeof parsed.detail === "string") detail = parsed.detail;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(response.status, detail);
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

  // ---- clients ---------------------------------------------------------------

  listClients(companyId?: string): Promise<ClientResponse[]> {
    const query = companyId ? `?company_id=${companyId}` : "";
    return this.request("GET", `/clients${query}`);
  }

  createClient(body: ClientCreateRequest): Promise<ClientResponse> {
    return this.request("POST", "/clients", body);
  }

  updateClient(clientId: string, body: ClientUpdateRequest): Promise<ClientResponse> {
    return this.request("PATCH", `/clients/${clientId}`, body);
  }

  // ---- products --------------------------------------------------------------

  listProducts(companyId?: string): Promise<ProductResponse[]> {
    const query = companyId ? `?company_id=${companyId}` : "";
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

  listInvoices(params?: { companyId?: string; status?: string }): Promise<InvoiceResponse[]> {
    const search = new URLSearchParams();
    if (params?.companyId) search.set("company_id", params.companyId);
    if (params?.status) search.set("status", params.status);
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

  listPayments(invoiceId: string): Promise<PaymentResponse[]> {
    return this.request("GET", `/payments?invoice_id=${invoiceId}`);
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
  }): Promise<ActivityEntryResponse[]> {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.targetType) search.set("target_type", params.targetType);
    const query = search.size > 0 ? `?${search}` : "";
    return this.request("GET", `/activity${query}`);
  }
}
