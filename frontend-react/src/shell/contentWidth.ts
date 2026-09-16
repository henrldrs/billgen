/** Which screens run to the edges, and which keep a reading measure.
 *
 *  A list, a report or the dashboard wants every pixel a wide screen has: a
 *  table with six columns reads better at 1800px than at 1400. A form or a
 *  record page does not — a label above a field 1700px wide, or a paragraph
 *  that long, is harder to read, not easier. SOLO_RUN parked this as item 10
 *  and T-50 built it: one class with two variants, chosen per route rather
 *  than per component.
 *
 *  Paths are the router's, under /app. A prefix here means "this screen and
 *  everything beneath it"; the invoice list's status tabs are the same screen
 *  and stay fluid, while `/id/` under it is the record and takes the measure. */

const MEASURED_PREFIXES = [
  "/app/sales/invoices/new",
  "/app/sales/invoices/id/",
  "/app/customers/clients/",
  "/app/company",
  "/app/settings",
  "/app/billing",
  "/app/onboarding",
  "/app/legal",
  "/app/help",
];

export function readingMeasure(pathname: string): boolean {
  return MEASURED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
