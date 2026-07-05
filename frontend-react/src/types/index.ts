/** Convenience aliases over the OpenAPI-generated types (src/types/api.d.ts).
 *  Regenerate with `npm run generate:api` whenever the backend schema changes. */

import type { components } from "./api";

export type SignupRequest = components["schemas"]["SignupRequest"];
export type SignupResponse = components["schemas"]["SignupResponse"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type LoginResponse = components["schemas"]["LoginResponse"];
export type TokenResponse = components["schemas"]["TokenResponse"];
export type UserMeResponse = components["schemas"]["UserMeResponse"];
export type OrganizationResponse = components["schemas"]["OrganizationResponse"];

export type CompanyCreateRequest = components["schemas"]["CompanyCreateRequest"];
export type CompanyResponse = components["schemas"]["CompanyResponse"];

export type ClientCreateRequest = components["schemas"]["ClientCreateRequest"];
export type ClientUpdateRequest = components["schemas"]["ClientUpdateRequest"];
export type ClientResponse = components["schemas"]["ClientResponse"];

export type ProductCreateRequest = components["schemas"]["ProductCreateRequest"];
export type ProductUpdateRequest = components["schemas"]["ProductUpdateRequest"];
export type ProductResponse = components["schemas"]["ProductResponse"];

export type InvoiceLineIn = components["schemas"]["InvoiceLineIn"];
export type InvoicePreviewRequest = components["schemas"]["InvoicePreviewRequest"];
export type InvoicePreviewResponse = components["schemas"]["InvoicePreviewResponse"];
export type InvoiceCreateRequest = components["schemas"]["InvoiceCreateRequest"];
export type InvoiceResponse = components["schemas"]["InvoiceResponse"];

export type CreditNoteIssueRequest = components["schemas"]["CreditNoteIssueRequest"];
export type CreditNoteResponse = components["schemas"]["CreditNoteResponse"];

export type PaymentCreateRequest = components["schemas"]["PaymentCreateRequest"];
export type PaymentRecordResponse = components["schemas"]["PaymentRecordResponse"];
export type PaymentResponse = components["schemas"]["PaymentResponse"];

export type KpiResponse = components["schemas"]["KpiResponse"];
export type RevenueByMonthResponse = components["schemas"]["RevenueByMonthResponse"];
export type ActivityEntryResponse = components["schemas"]["ActivityEntryResponse"];
