/** Sample data for the template preview (§18).
 *
 *  Scaffold — see README.md.
 *
 *  Previewing a template against an empty invoice is how a template ships
 *  broken: nothing wraps, nothing overflows, every column fits, and the VAT
 *  summary never appears because there is only ever one rate. So the sample
 *  is chosen to break things on purpose — it carries three VAT rates, a
 *  description long enough to wrap, a line discount, an invoice-level
 *  discount, and a customer with a reverse-charge VAT number.
 *
 *  `SAMPLES` is the picker's list. Add a case here rather than making the
 *  preview conditional; a preview with branches is a preview of something the
 *  renderer will never produce.
 */

import type { InvoiceDraft } from "./types";

export interface SampleInvoice {
  key: string;
  label: string;
  draft: InvoiceDraft;
  /** Invoice-level discount, kept out of the draft: it is a composer field. */
  invoiceDiscountPercent: string;
}

const TYPICAL: InvoiceDraft = {
  customer: {
    id: "sample-acme",
    name: "Acme SRL",
    vatNumber: "BE 0123.456.749",
    email: "accounts@acme.example",
    addressLine: "Rue Example 12",
    postalCode: "1000",
    city: "Brussels",
    country: "BE",
    isBusiness: true,
    paymentTermsDays: 30,
  },
  reference: "INV-2026/0042",
  issueDate: "2026-08-26",
  dueDate: "2026-09-25",
  currency: "EUR",
  language: "fr",
  lines: [
    {
      key: "s1",
      description:
        "Website development — discovery workshop, design system, implementation and two rounds of revisions",
      quantity: "1",
      unit: "project",
      unitPrice: "1000.00",
      vatRate: "21",
      vatCategory: "S",
    },
    {
      key: "s2",
      description: "Maintenance retainer",
      quantity: "2",
      unit: "month",
      unitPrice: "250.00",
      vatRate: "21",
      vatCategory: "S",
      discountPercent: "10",
    },
    {
      key: "s3",
      description: "Printed documentation",
      quantity: "1",
      unit: "unit",
      unitPrice: "200.00",
      vatRate: "12",
      vatCategory: "S",
    },
    {
      key: "s4",
      description: "Hosting handbook (printed matter)",
      quantity: "1",
      unit: "unit",
      unitPrice: "100.00",
      vatRate: "6",
      vatCategory: "S",
    },
  ],
  references: { purchaseOrder: "PO-8891", customerReference: "ACME-2026-08" },
  payment: {
    termsDays: 30,
    iban: "BE68 5390 0754 7034",
    bic: "GKCCBEBB",
    structuredCommunication: "+++090/9337/55493+++",
  },
  notes: "Thank you for your business.",
  terms: "Late payment carries interest at the statutory rate.",
};

/** Reverse charge: the totals block has to render €0 VAT *and* a mention. */
const INTRA_EU: InvoiceDraft = {
  ...TYPICAL,
  customer: {
    id: "sample-mistral",
    name: "Mistral SAS",
    vatNumber: "FR 12345678901",
    email: "compta@mistral.example",
    addressLine: "12 rue de la Paix",
    postalCode: "75002",
    city: "Paris",
    country: "FR",
    isBusiness: true,
    paymentTermsDays: 30,
  },
  reference: "INV-2026/0043",
  lines: TYPICAL.lines.map((line) => ({
    ...line,
    vatRate: "0",
    vatCategory: "AE",
  })),
};

/** One line, one rate, nothing optional. The floor a template must not fail. */
const MINIMAL: InvoiceDraft = {
  ...TYPICAL,
  reference: "INV-2026/0044",
  lines: [
    {
      key: "m1",
      description: "Consulting",
      quantity: "1",
      unitPrice: "500.00",
      vatRate: "21",
      vatCategory: "S",
    },
  ],
  references: {},
  notes: undefined,
  terms: undefined,
};

export const SAMPLES: SampleInvoice[] = [
  { key: "typical", label: "Typical invoice", draft: TYPICAL, invoiceDiscountPercent: "5" },
  { key: "intra_eu", label: "Intra-EU reverse charge", draft: INTRA_EU, invoiceDiscountPercent: "0" },
  { key: "minimal", label: "Minimal invoice", draft: MINIMAL, invoiceDiscountPercent: "0" },
];

export function sampleByKey(key: string): SampleInvoice {
  return SAMPLES.find((sample) => sample.key === key) ?? SAMPLES[0];
}
