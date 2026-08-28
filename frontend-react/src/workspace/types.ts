/** The invoice draft the workspace edits, and nothing else.
 *
 *  Scaffold — see README.md. Not exported from the package index.
 *
 *  This is deliberately *not* the generated `InvoiceResponse` from
 *  `src/types`. A draft in a four-step workspace is a different thing from a
 *  server record: every field can be absent while the user is still on step
 *  one, quantities are strings because they come out of text inputs, and there
 *  is no id until something has been saved. Reusing the API type would force
 *  either a wall of optionals over the real contract or a lie about what is
 *  present, and the readiness check (§8) exists precisely to convert one into
 *  the other at a single point.
 *
 *  Money is a string throughout, matching the API. Decimal arithmetic in
 *  binary floats is how a €1,210.00 invoice becomes €1,209.99, and the
 *  server's totals are the ones that are legally binding — `totals.ts`
 *  computes only what the screen shows while typing.
 */

export interface DraftCustomer {
  id: string | null;
  name: string;
  vatNumber?: string;
  email?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  isBusiness: boolean;
  paymentTermsDays?: number;
}

export interface DraftLine {
  /** Client-side only. Line identity has to survive reordering and removal. */
  key: string;
  description: string;
  quantity: string;
  unit?: string;
  unitPrice: string;
  vatRate: string;
  /** EN 16931 category. Defaulted from `GET /vat-treatment` once wired. */
  vatCategory?: string;
  discountPercent?: string;
  /** Set when the line came from the catalog; cleared once the user edits it. */
  productId?: string | null;
}

export interface DraftReferences {
  purchaseOrder?: string;
  customerReference?: string;
  projectReference?: string;
}

export interface DraftPayment {
  termsDays?: number;
  iban?: string;
  bic?: string;
  structuredCommunication?: string;
}

export interface InvoiceDraft {
  customer: DraftCustomer | null;
  reference?: string;
  issueDate?: string;
  dueDate?: string;
  currency: string;
  language: string;
  lines: DraftLine[];
  references: DraftReferences;
  payment: DraftPayment;
  notes?: string;
  terms?: string;
  internalNote?: string;
  templateId?: string | null;
}

export type WorkspaceStep = "customer" | "items" | "details" | "review";

export const WORKSPACE_STEPS: WorkspaceStep[] = ["customer", "items", "details", "review"];

export function emptyDraft(currency = "EUR", language = "fr"): InvoiceDraft {
  return {
    customer: null,
    currency,
    language,
    lines: [],
    references: {},
    payment: {},
  };
}

export function emptyLine(): DraftLine {
  return {
    key: `line-${Math.random().toString(36).slice(2, 10)}`,
    description: "",
    quantity: "1",
    unitPrice: "0",
    vatRate: "21",
    productId: null,
  };
}
