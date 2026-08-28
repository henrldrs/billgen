/** React Query hooks over the ApiClient. Server state only — no business math
 *  here; totals always come from the API's preview/report endpoints. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
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

export function useTemplates(companyId?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["templates", companyId ?? "all"],
    queryFn: () => api.listTemplates(companyId),
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
