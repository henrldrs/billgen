/** The readiness check (§8) — the single place a draft becomes an invoice.
 *
 *  Scaffold — see README.md.
 *
 *  Two things this is careful about.
 *
 *  **It is not validation.** The server refuses an invoice that is not legally
 *  issuable, and `core/services/peppol_validation.py` refuses one that is not
 *  transmissible. This function decides only whether to let the user press
 *  Continue, and a check here that the server does not enforce is a check a
 *  determined user will route around — so every `blocking` item below has a
 *  server-side counterpart, and everything else is a `warning`.
 *
 *  **A warning is not a smaller error.** "No purchase order" is advice; the UI
 *  shows it and continues. Rendering the two at the same weight is how a
 *  readiness panel becomes a wall of ticks nobody reads.
 */

import type { InvoiceDraft } from "./types";

export type ReadinessSeverity = "ok" | "warning" | "blocking";

export interface ReadinessItem {
  key: string;
  label: string;
  severity: ReadinessSeverity;
  /** Shown only when the item is not ok. */
  detail?: string;
}

export function checkReadiness(draft: InvoiceDraft): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const customer = draft.customer;

  items.push(
    customer
      ? { key: "customer", label: "Customer information", severity: "ok" }
      : {
          key: "customer",
          label: "Customer information",
          severity: "blocking",
          detail: "Select or create a customer.",
        },
  );

  // A business customer without a VAT number is not refused — it is a real
  // situation (a newly registered company, a non-taxable legal person) and the
  // consequence is that Peppol delivery and reverse charge are unavailable,
  // not that the invoice is invalid.
  if (customer?.isBusiness && !customer.vatNumber) {
    items.push({
      key: "vat",
      label: "VAT information",
      severity: "warning",
      detail: "This business customer has no VAT number; reverse charge and Peppol are unavailable.",
    });
  } else {
    items.push({ key: "vat", label: "VAT information", severity: "ok" });
  }

  items.push(
    draft.issueDate
      ? { key: "dates", label: "Dates", severity: "ok" }
      : {
          key: "dates",
          label: "Dates",
          severity: "blocking",
          detail: "An issue date is required.",
        },
  );

  if (draft.issueDate && draft.dueDate && draft.dueDate < draft.issueDate) {
    items.push({
      key: "due_before_issue",
      label: "Due date",
      severity: "blocking",
      detail: "The due date is before the issue date.",
    });
  }

  const usableLines = draft.lines.filter((line) => line.description.trim().length > 0);
  items.push(
    usableLines.length > 0
      ? { key: "lines", label: "Line items", severity: "ok" }
      : {
          key: "lines",
          label: "Line items",
          severity: "blocking",
          detail: "An invoice needs at least one line.",
        },
  );

  const zeroPriced = usableLines.filter((line) => Number(line.unitPrice) === 0);
  if (zeroPriced.length > 0) {
    items.push({
      key: "zero_priced",
      label: "Prices",
      severity: "warning",
      detail: `${zeroPriced.length} line(s) are priced at zero.`,
    });
  }

  items.push(
    draft.payment.iban
      ? { key: "payment", label: "Payment information", severity: "ok" }
      : {
          key: "payment",
          label: "Payment information",
          severity: "warning",
          detail: "No IBAN on the invoice — the customer has nowhere to pay.",
        },
  );

  // The number is the server's. It is assigned by `issue()` under a row lock
  // so the Belgian series stays gapless, which is why the composer never
  // shows a real one and this item never blocks: a draft legitimately has no
  // reference at all.
  items.push({
    key: "reference",
    label: "Invoice number",
    severity: "ok",
    detail: draft.reference ? undefined : "Assigned by BillGen when the invoice is issued.",
  });

  return items;
}

export function isReady(items: ReadinessItem[]): boolean {
  return !items.some((item) => item.severity === "blocking");
}
