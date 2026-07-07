import { render } from "@testing-library/react";
import type { ReactNode } from "react";

import { ApiClient, MemoryTokenStore } from "../lib/apiClient";
import { BillGenProvider } from "../providers/BillGenProvider";
import type { CompanyResponse, InvoiceResponse } from "../types";

export const BASE = "http://api.test";
export const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

export function renderWithProvider(ui: ReactNode) {
  const tokens = new MemoryTokenStore();
  tokens.set({ access_token: "access", refresh_token: "refresh" });
  const client = new ApiClient({ baseUrl: BASE, tokens });
  return render(<BillGenProvider client={client}>{ui}</BillGenProvider>);
}

export function invoiceRecord(
  id: string,
  reference: string,
  extra: Partial<InvoiceResponse> = {},
): InvoiceResponse {
  return {
    id,
    company_id: COMPANY_ID,
    client_id: "c-1",
    reference,
    sequence_global: 1,
    issue_date: "2026-07-04",
    due_date: "2026-08-03",
    currency: "EUR",
    lines: [],
    invoice_discount: null,
    comments: null,
    payment_terms: null,
    pdf_template: "fr_standard",
    subtotal_ht: "1250.00",
    total_discount: "0.00",
    total_vat: "262.50",
    total_ttc: "1512.50",
    status: "issued",
    voided_at: null,
    voided_reason: null,
    voided_by_credit_note_id: null,
    ...extra,
  };
}

export function companyRecord(extra: Partial<CompanyResponse> = {}): CompanyResponse {
  return {
    id: COMPANY_ID,
    organization_id: "org-1",
    name: "Acme Consulting",
    legal_name: null,
    vat_number: null,
    registration_number: null,
    email: null,
    address_line1: null,
    postal_code: null,
    city: null,
    country_code: "BE",
    iban: null,
    bic: null,
    default_currency: "EUR",
    default_language: "fr",
    default_pdf_template: "fr_standard",
    invoice_reference_prefix: "ACME-",
    ...extra,
  };
}
