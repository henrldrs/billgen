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
export type CompanyUpdateRequest = components["schemas"]["CompanyUpdateRequest"];
export type CompanyResponse = components["schemas"]["CompanyResponse"];
export type CompanyValidationResponse = components["schemas"]["CompanyValidationResponse"];
export type IdentifierCheck = components["schemas"]["IdentifierCheck"];

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
export type IssueRequest = components["schemas"]["IssueRequest"];
export type InvoiceResponse = components["schemas"]["InvoiceResponse"];
export type InvoiceLineOut = components["schemas"]["InvoiceLineOut"];

export type CreditNoteIssueRequest = components["schemas"]["CreditNoteIssueRequest"];
export type CreditNoteResponse = components["schemas"]["CreditNoteResponse"];

export type PaymentCreateRequest = components["schemas"]["PaymentCreateRequest"];
export type PaymentRecordResponse = components["schemas"]["PaymentRecordResponse"];
export type PaymentResponse = components["schemas"]["PaymentResponse"];

export type KpiResponse = components["schemas"]["KpiResponse"];
export type RevenueByMonthResponse = components["schemas"]["RevenueByMonthResponse"];
export type ActivityEntryResponse = components["schemas"]["ActivityEntryResponse"];

export type ImportReport = components["schemas"]["ImportReportResponse"];
export type ImportEntityCounts = components["schemas"]["ImportEntityCounts"];
export type ImportIssue = components["schemas"]["ImportIssue"];

/** Sprint 1-3 reads. Every one of these replaces an aggregation the browser was
 *  doing over a full list fetch — see docs/ROADMAP_IA.md sections 6.2-6.6. */
export type InvoiceReportResponse = components["schemas"]["InvoiceReportResponse"];
export type StatusBucketResponse = components["schemas"]["StatusBucketResponse"];
export type ClientStatsResponse = components["schemas"]["ClientStatsResponse"];
export type TimelineEventResponse = components["schemas"]["TimelineEventResponse"];
export type VatReportResponse = components["schemas"]["VatReportResponse"];
export type VatReportLineResponse = components["schemas"]["VatReportLineResponse"];

/** Server-owned constants the UI has been hardcoding (21/12/6/0, template ids). */
export type VatRatesResponse = components["schemas"]["VatRatesResponse"];
export type VatRateOption = components["schemas"]["VatRateOption"];
export type PdfTemplatesResponse = components["schemas"]["PdfTemplatesResponse"];
export type PdfTemplateOption = components["schemas"]["PdfTemplateOption"];

/** The kind of a client-timeline event. Widened from the server's free string
 *  so a switch in a renderer is exhaustive. */
export type TimelineEventKind =
  | "invoice_drafted"
  | "invoice_issued"
  | "invoice_voided"
  | "credit_note_issued"
  | "payment_received";

/** Commercial tier and allowances (B4). `EntitlementsResponse` is what the shell
 *  reads on boot to render the right variant of each screen; enforcement is the
 *  server's, and arrives as a 402 (see `isEntitlementError` in the ApiClient). */
export type EntitlementsResponse = components["schemas"]["EntitlementsResponse"];
export type MeterUsageResponse = components["schemas"]["MeterUsageResponse"];
export type PlansResponse = components["schemas"]["PlansResponse"];
export type TierResponse = components["schemas"]["TierResponse"];

/** The four plans, in upgrade order. */
export type PlanTierName = "free" | "starter" | "business" | "business_pro";
