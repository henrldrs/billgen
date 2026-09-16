/** The receivable state of an invoice, derived the way the server derives it.
 *
 *  effective_status() in core/services/reporting_service.py refines a stored
 *  status with the calendar: an issued or partially paid invoice whose due date
 *  has passed IS overdue, whether or not the row says so. Reports, the KPIs and
 *  the alerts all read that refinement; a list screen that reads the stored
 *  status alone badges a 43-day-old receivable as "Issued" (T-45). */

import type { InvoiceResponse } from "../types";

const MS_PER_DAY = 86_400_000;

/** The statuses that can be overdue at all. A draft has no due date that
 *  binds anyone; paid and voided invoices are closed. */
const RECEIVABLE = new Set(["issued", "partially_paid", "overdue"]);

/** Local midnight for an ISO date, so a DST change never makes one day 23
 *  hours long and a difference of days off by one. */
function localDay(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** How many days past due, or null when the invoice is not overdue. Zero is
 *  null too: an invoice due today is still on time until tomorrow, which is
 *  the strict comparison the server makes. */
export function daysOverdue(
  invoice: Pick<InvoiceResponse, "status" | "due_date">,
  today: Date = new Date(),
): number | null {
  if (!RECEIVABLE.has(invoice.status) || !invoice.due_date) return null;
  const due = localDay(invoice.due_date);
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((now.getTime() - due.getTime()) / MS_PER_DAY);
  return days > 0 ? days : null;
}
