/** React Query hooks over the ApiClient. Server state only — no business math
 *  here; totals always come from the API's preview/report endpoints. */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AcceptRequest,
  ClientCreateRequest,
  ClientUpdateRequest,
  CompanyCreateRequest,
  CompanyUpdateRequest,
  CreditNoteIssueRequest,
  InvoiceCreateRequest,
  InvoicePreviewRequest,
  PaymentCreateRequest,
  ProductCreateRequest,
  ProductUpdateRequest,
  TemplateCreateRequest,
  TemplateUpdateRequest,
} from "../types";
import { useApi } from "../providers/BillGenProvider";

// ---- companies ---------------------------------------------------------------

export function useCompanies() {
  const api = useApi();
  return useQuery({ queryKey: ["companies"], queryFn: () => api.listCompanies() });
}

export function useCreateCompany() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyCreateRequest) => api.createCompany(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      //  The first run watches for a company (T-29).
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

// ---- clients -------------------------------------------------------------------

export function useClients(companyId?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["clients", companyId ?? "all"],
    queryFn: () => api.listClients(companyId),
  });
}

/** One client by id — the identity half of Client 360. */
export function useClient(clientId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ["clients", "detail", clientId],
    queryFn: () => api.getClient(clientId as string),
    enabled: Boolean(clientId),
  });
}

export function useCreateClient() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ClientCreateRequest) => api.createClient(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

export function useUpdateClient() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, body }: { clientId: string; body: ClientUpdateRequest }) =>
      api.updateClient(clientId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

// ---- products ------------------------------------------------------------------

export function useProducts(
  companyIdOrParams?: string | { companyId?: string; status?: string; billingType?: string },
) {
  const api = useApi();
  const params =
    typeof companyIdOrParams === "string"
      ? { companyId: companyIdOrParams }
      : (companyIdOrParams ?? {});
  return useQuery({
    queryKey: [
      "products",
      params.companyId ?? "all",
      params.status ?? "any-status",
      params.billingType ?? "any-type",
    ],
    queryFn: () => api.listProducts(params),
  });
}

export function useCreateProduct() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreateRequest) => api.createProduct(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

export function useUpdateProduct() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: ProductUpdateRequest }) =>
      api.updateProduct(productId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

// ---- invoices --------------------------------------------------------------------

export function useInvoices(params?: {
  companyId?: string;
  status?: string;
  clientId?: string;
}) {
  const api = useApi();
  return useQuery({
    queryKey: [
      "invoices",
      params?.companyId ?? "all",
      params?.status ?? "any",
      params?.clientId ?? "any-client",
    ],
    queryFn: () => api.listInvoices(params),
  });
}

export function useInvoice(invoiceId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: () => api.getInvoice(invoiceId as string),
    enabled: Boolean(invoiceId),
  });
}

export function useInvoicePreview() {
  const api = useApi();
  return useMutation({
    mutationFn: (body: InvoicePreviewRequest) => api.previewInvoice(body),
  });
}

export function useCreateInvoice() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InvoiceCreateRequest) => api.createInvoice(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useIssueInvoice() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => api.issueInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDeleteInvoice() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => api.deleteInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

/** Copy an invoice into a new draft. Only the invoice list changes — no number
 *  is consumed, so nothing in the reports moves. */
export function useDuplicateInvoice() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => api.duplicateInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useVoidInvoice() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      api.voidInvoice(invoiceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// ---- credit notes ------------------------------------------------------------------

export function useCreditNotes(companyId?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["credit-notes", companyId ?? "all"],
    queryFn: () => api.listCreditNotes(companyId),
  });
}

export function useIssueCreditNote() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreditNoteIssueRequest) => api.issueCreditNote(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// ---- payments ------------------------------------------------------------------------

export function usePayments(invoiceId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: () => api.listPayments(invoiceId as string),
    enabled: Boolean(invoiceId),
  });
}

export function useRecordPayment() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PaymentCreateRequest) => api.recordPayment(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// ---- reports & activity -----------------------------------------------------------------

/** The dashboard's alerts, and the top bar's bell. Refetched after any
 *  mutation (see BillGenProvider): an alert is a function of the data, so a
 *  recorded payment or a fixed VAT number changes the answer immediately. */
export function useAlerts(companyId: string | undefined, today?: string, limit?: number) {
  const api = useApi();
  return useQuery({
    queryKey: ["alerts", companyId, today ?? "", limit ?? 0],
    queryFn: () => api.alerts(companyId as string, today, limit),
    enabled: Boolean(companyId),
  });
}

export function useKpi(companyId: string | undefined, today?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["reports", "kpi", companyId, today ?? "now"],
    queryFn: () => api.kpi(companyId as string, today),
    enabled: Boolean(companyId),
  });
}

export function useRevenue(companyId: string | undefined, year: number) {
  const api = useApi();
  return useQuery({
    queryKey: ["reports", "revenue", companyId, year],
    queryFn: () => api.revenue(companyId as string, year),
    enabled: Boolean(companyId),
  });
}

export function useActivity(params?: {
  limit?: number;
  targetType?: string;
  targetId?: string;
}) {
  const api = useApi();
  return useQuery({
    queryKey: [
      "activity",
      params?.limit ?? 50,
      params?.targetType ?? "all",
      params?.targetId ?? "all-targets",
    ],
    queryFn: () => api.activity(params),
    // A per-record log is only meaningful once the record is known; without
    // this an undefined id would fetch the whole org's log and look scoped.
    enabled: params?.targetId === undefined || Boolean(params.targetId),
  });
}

// ---- imports -------------------------------------------------------------------

export function useImportPreview() {
  const api = useApi();
  return useMutation({
    mutationFn: (backup: unknown) => api.previewLegacyImport(backup),
  });
}

export function useImportCommit() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backup: unknown) => api.commitLegacyImport(backup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ---- backup (ADR-0003) -----------------------------------------------------------

export function useBackupExport() {
  const api = useApi();
  return useMutation({
    mutationFn: () => api.exportBackup(),
  });
}

/** T-28's carried backup. No cache: a download is an act, not a read. */
export function useSealedBackupExport() {
  const api = useApi();
  return useMutation({
    mutationFn: (passphrase: string) => api.exportBackupEncrypted(passphrase),
  });
}

export function useBackupRestoreFile() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ archive, passphrase }: { archive: ArrayBuffer; passphrase?: string }) =>
      api.restoreBackupFile(archive, passphrase),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

/** The sentence a person reads before choosing a passphrase. Generated
 *  server-side, so it never goes stale against the archive format. */
export function usePassphraseNotice() {
  const api = useApi();
  return useQuery({
    queryKey: ["backup", "passphrase-notice"],
    queryFn: () => api.passphraseNotice(),
    staleTime: Infinity,
  });
}

// ---- trust — read by Settings → Data & privacy (2026-09-13) ---------------------

export function usePrivacyRegister() {
  const api = useApi();
  return useQuery({
    queryKey: ["trust", "privacy-register"],
    queryFn: () => api.privacyRegister(),
    staleTime: 10 * 60_000,
  });
}

export function useLegalDocuments() {
  const api = useApi();
  return useQuery({
    queryKey: ["trust", "legal-documents"],
    queryFn: () => api.legalDocuments(),
    staleTime: 10 * 60_000,
  });
}

// ---- the signed-in person and their organization ---------------------------------

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: ["me"], queryFn: () => api.me() });
}

export function useCurrentOrganization() {
  const api = useApi();
  return useQuery({ queryKey: ["organization"], queryFn: () => api.currentOrganization() });
}

export function useBackupRestore() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backup: unknown) => api.restoreBackup(backup),
    // A restore repopulates the whole organization — everything is stale.
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

// ---- Sprint 1-3 reads --------------------------------------------------------------
//
// Each of these replaces work the browser was doing over a full list fetch, or a
// server constant TypeScript was duplicating. See docs/ROADMAP_IA.md §6.

/** One company by id. The list endpoint already returns full companies, so reach
 *  for this only when a screen is addressed by company id (a settings route). */
export function useCompany(companyId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ["companies", "detail", companyId],
    queryFn: () => api.getCompany(companyId as string),
    enabled: Boolean(companyId),
  });
}

/** Edit the company — the endpoint that unblocked all six partial Company areas
 *  (B3). Invalidates the whole `companies` key: the record is embedded in every
 *  PDF and every invoice header, so a stale copy is visible immediately. */
export function useUpdateCompany() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, body }: { companyId: string; body: CompanyUpdateRequest }) =>
      api.updateCompany(companyId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company-validation"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

/** Per-field verdict on the company's VAT / IBAN / BIC. Supplier side of the
 *  Peppol gate only — never render this as "your invoices will be delivered". */
export function useCompanyValidation(companyId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ["company-validation", companyId],
    queryFn: () => api.validateCompany(companyId as string),
    enabled: Boolean(companyId),
  });
}

// ---- the person, and what they call their business (T-29) -----------------------

/** Both halves of the first run's profile step. They are separate calls
 *  because they are separate records — and the e-mail is deliberately not
 *  among them: the desktop bootstrap finds its singleton user by that address,
 *  so changing it would mint a second user and a second organization on the
 *  next launch. */
export function useUpdateMe() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name?: string; language?: string }) => api.updateMe(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useRenameOrganization() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.renameOrganization(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

// ---- privacy — a client is a data subject (T-35) ---------------------------------

export function useExportClientData() {
  const api = useApi();
  return useMutation({ mutationFn: (clientId: string) => api.exportClientData(clientId) });
}

export function useEraseClientData() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => api.eraseClientData(clientId),
    onSuccess: (_result, clientId) => {
      void queryClient.invalidateQueries({ queryKey: ["clients", "detail", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ---- onboarding — the guided first run (T-29) ----------------------------------

/** Derived on every call; `completed_at` is what the first-run gate reads. */
export function useOnboardingStatus() {
  const api = useApi();
  return useQuery({ queryKey: ["onboarding"], queryFn: () => api.onboardingStatus() });
}

export function useAcceptLegalText() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AcceptRequest) => api.acceptLegalText(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useCompleteOnboarding() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.completeOnboarding(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding"] }),
  });
}

/** Client 360's header numbers. */
export function useClientStats(clientId: string | undefined, today?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["clients", "stats", clientId, today ?? "today"],
    queryFn: () => api.clientStats(clientId as string, today),
    enabled: Boolean(clientId),
  });
}

/** The commercial timeline: what was sold, credited and paid. Not the audit log
 *  — `useActivity({ targetId })` is that, and it can only ever return edits to
 *  the client record itself. */
export function useClientTimeline(clientId: string | undefined, limit?: number) {
  const api = useApi();
  return useQuery({
    queryKey: ["clients", "timeline", clientId, limit ?? 100],
    queryFn: () => api.clientTimeline(clientId as string, limit),
    enabled: Boolean(clientId),
  });
}

/** Payments across invoices — the Payments report, and Client 360's payment
 *  history. `usePayments(invoiceId)` stays the per-invoice case. */
export function usePaymentsList(params: {
  companyId?: string;
  clientId?: string;
  invoiceId?: string;
  paidFrom?: string;
  paidTo?: string;
}) {
  const api = useApi();
  return useQuery({
    queryKey: [
      "payments",
      "list",
      params.companyId ?? "all",
      params.clientId ?? "all",
      params.invoiceId ?? "all",
      params.paidFrom ?? "",
      params.paidTo ?? "",
    ],
    queryFn: () => api.listPayments(params),
  });
}

/** Invoice counts and money per effective status, plus a monthly series. */
export function useInvoiceReport(
  companyId: string | undefined,
  params?: { period?: string; today?: string },
) {
  const api = useApi();
  return useQuery({
    queryKey: ["reports", "invoices", companyId, params?.period ?? "all", params?.today ?? ""],
    queryFn: () => api.invoiceReport(companyId as string, params),
    enabled: Boolean(companyId),
  });
}

/** The payments total, for the same window the list is showing.
 *
 *  Deliberately a second request rather than a number derived from
 *  `usePaymentsList`: that list is paginated in the browser, so summing it
 *  gives the total of the visible page, and it serialises amounts as stored
 *  rather than quantized to the currency. The server owns the arithmetic. */
export function usePaymentReport(
  companyId: string | undefined,
  params?: { period?: string; clientId?: string; paidFrom?: string; paidTo?: string },
) {
  const api = useApi();
  return useQuery({
    queryKey: [
      "reports",
      "payments",
      companyId,
      params?.period ?? "all",
      params?.clientId ?? "all",
      params?.paidFrom ?? "",
      params?.paidTo ?? "",
    ],
    queryFn: () => api.paymentReport(companyId as string, params),
    enabled: Boolean(companyId),
  });
}

/** Output VAT for one declaration period. The response's `covers` field says
 *  `output_vat_only`: it is a preparation aid, never a filed return. */
export function useVatReport(companyId: string | undefined, period: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["reports", "vat", companyId, period],
    queryFn: () => api.vatReport(companyId as string, period),
    enabled: Boolean(companyId) && Boolean(period),
  });
}

/** Server-owned reference data. Both are constants that change only when the
 *  backend does, hence Infinity — refetching them per mount is pure noise. */
export function useVatRates() {
  const api = useApi();
  return useQuery({
    queryKey: ["reference", "vat-rates"],
    queryFn: () => api.vatRates(),
    staleTime: Infinity,
  });
}

export function usePdfTemplates() {
  const api = useApi();
  return useQuery({
    queryKey: ["reference", "pdf-templates"],
    queryFn: () => api.pdfTemplates(),
    staleTime: Infinity,
  });
}

// ---- entitlements (B4) --------------------------------------------------------------

/** This tenant's plan, features and remaining allowances.
 *
 *  Use it to render the UI honestly — badge what the plan does not include,
 *  show "7 of 10 invoices this month" — never as the security boundary. The
 *  server refuses independently with a 402, which is what actually protects the
 *  feature. Long `staleTime` because a tier changes at most a few times a year;
 *  a successful upgrade should invalidate `["entitlements"]` explicitly. */
export function useEntitlements() {
  const api = useApi();
  return useQuery({
    queryKey: ["entitlements"],
    queryFn: () => api.entitlements(),
    staleTime: 5 * 60 * 1000,
  });
}

/** The published plan matrix, for a pricing or upgrade screen. */
export function usePlans() {
  const api = useApi();
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => api.plans(),
    staleTime: Infinity,
  });
}

// ---- document templates ------------------------------------------------------
//
// Every mutation invalidates the list rather than patching the cache. A publish
// changes `published_version` and a set-default changes a *sibling* row's flag,
// so a hand-rolled cache update would have to know which other rows moved —
// which is exactly the knowledge the server already has.

export function useTemplates(companyId?: string, docType?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["templates", companyId ?? "all", docType ?? "all"],
    queryFn: () => api.listTemplates(companyId, docType),
  });
}

export function useCreateTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TemplateCreateRequest) => api.createTemplate(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TemplateUpdateRequest }) =>
      api.updateTemplate(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function usePublishTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.publishTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useSetDefaultTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.setDefaultTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

/** The VAT treatment a company/client pair implies — advisory, for defaulting.
 *
 *  Disabled until a client is picked: the whole answer turns on who the buyer
 *  is, so asking before one is chosen has nothing to answer from. */
export function useVatTreatment(
  companyId: string | undefined,
  clientId: string | undefined,
  lang?: string,
) {
  const api = useApi();
  return useQuery({
    queryKey: ["vat-treatment", companyId, clientId, lang ?? ""],
    queryFn: () => api.vatTreatment(companyId as string, clientId as string, lang),
    enabled: Boolean(companyId) && Boolean(clientId),
    // A seller/buyer pair's treatment changes when the client record changes,
    // which is rare and invalidated elsewhere; re-asking on every focus is
    // noise on a screen that is already asking for a preview per keystroke.
    staleTime: 5 * 60_000,
  });
}

// ---- search ----------------------------------------------------------------------

/** Debounced global search — one term over invoices, quotes, credit notes,
 *  clients and products.
 *
 *  The debounce lives in the hook rather than in the caller on purpose. What
 *  drives this is a text field that fires on every keystroke, and a caller who
 *  forgets to debounce sends one request per character typed. 180ms sits below
 *  the point where a result feels late and above a fast typist's gap between
 *  keys.
 *
 *  Below two characters the query is disabled rather than sent. The server
 *  answers a one-character term with nothing by design, so asking is a round
 *  trip that cannot produce a result.
 *
 *  Previous results are held while a new term is in flight: a palette that
 *  empties itself between keystrokes flickers, and the stale list is a better
 *  answer than no list for the ~200ms it takes to replace it.
 */
export function useSearch(term: string, limit?: number) {
  const api = useApi();
  const [debounced, setDebounced] = useState(term);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term), 180);
    return () => window.clearTimeout(timer);
  }, [term]);

  const q = debounced.trim();

  return useQuery({
    queryKey: ["search", q, limit ?? null],
    queryFn: () => api.search(q, limit),
    enabled: q.length >= 2,
    // A palette is reopened constantly with the same few terms; refetching a
    // result the user is still looking at buys nothing.
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}
