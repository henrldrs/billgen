/** Live totals while typing — and a warning about what they are not.
 *
 *  Scaffold — see README.md.
 *
 *  **These numbers are not the invoice.** The server computes the binding
 *  totals in `core`, with Decimal arithmetic and the discount-allocation rules
 *  in `core/rules/discounts.py`. What is here exists so the right-hand preview
 *  can update on every keystroke without a round trip, and it will disagree
 *  with the server in the third decimal place on a bad day.
 *
 *  So: the workspace shows these, the review step shows the server's, and
 *  nothing sends these anywhere. `InvoiceReview` re-fetches rather than
 *  trusting them — which is why the review step is a step and not a summary.
 */

import type { DraftLine } from "./types";

export interface VatSummaryRow {
  /** Rate as it was typed, e.g. "21". Grouping key. */
  rate: string;
  base: number;
  vat: number;
}

export interface DraftTotals {
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  /** One row per distinct rate — §7's "VAT summary" when there is more than one. */
  vatSummary: VatSummaryRow[];
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function lineSubtotal(line: DraftLine): number {
  const gross = num(line.quantity) * num(line.unitPrice);
  const discount = gross * (num(line.discountPercent) / 100);
  return gross - discount;
}

export function computeTotals(lines: DraftLine[], invoiceDiscountPercent = "0"): DraftTotals {
  const byRate = new Map<string, VatSummaryRow>();
  let gross = 0;
  let netBeforeInvoiceDiscount = 0;

  for (const line of lines) {
    gross += num(line.quantity) * num(line.unitPrice);
    netBeforeInvoiceDiscount += lineSubtotal(line);
  }

  // An invoice-level discount reduces every line's VAT base proportionally.
  // Applying it only to the total would produce a VAT figure that does not
  // correspond to any base on the document — which is exactly the kind of
  // arithmetic the expense-side validator flags on other people's invoices.
  const invoiceDiscount = netBeforeInvoiceDiscount * (num(invoiceDiscountPercent) / 100);
  const factor = netBeforeInvoiceDiscount === 0 ? 1 : 1 - invoiceDiscount / netBeforeInvoiceDiscount;

  let vat = 0;
  for (const line of lines) {
    const base = lineSubtotal(line) * factor;
    const rate = line.vatRate || "0";
    const lineVat = base * (num(rate) / 100);
    vat += lineVat;

    const row = byRate.get(rate) ?? { rate, base: 0, vat: 0 };
    row.base += base;
    row.vat += lineVat;
    byRate.set(rate, row);
  }

  const subtotal = netBeforeInvoiceDiscount * factor;
  return {
    subtotal,
    discount: gross - netBeforeInvoiceDiscount + invoiceDiscount,
    vat,
    total: subtotal + vat,
    vatSummary: [...byRate.values()].sort((a, b) => num(b.rate) - num(a.rate)),
  };
}
