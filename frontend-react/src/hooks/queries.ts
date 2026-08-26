/** React Query hooks over the ApiClient. Server state only — no business math
 *  here; totals always come from the API's preview/report endpoints. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ClientCreateRequest,
  ClientUpdateRequest,
  CompanyCreateRequest,
  CreditNoteIssueRequest,
  InvoiceCreateRequest,
  InvoicePreviewRequest,
  PaymentCreateRequest,
  ProductCreateRequest,
  ProductUpdateRequest,
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

export function useProducts(companyId?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["products", companyId ?? "all"],
    queryFn: () => api.listProducts(companyId),
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
