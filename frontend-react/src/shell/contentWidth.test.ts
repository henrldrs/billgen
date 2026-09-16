import { readingMeasure } from "./contentWidth";

test("lists, reports and the dashboard run to the edges", () => {
  for (const path of [
    "/app",
    "/app/sales/invoices",
    "/app/sales/invoices/overdue",
    "/app/sales/credit-notes",
    "/app/customers/clients",
    "/app/catalog/products",
    "/app/reports/revenue",
    "/app/activity/audit",
  ]) {
    expect(readingMeasure(path), path).toBe(false);
  }
});

test("forms and record pages keep a reading measure", () => {
  for (const path of [
    "/app/sales/invoices/new",
    "/app/sales/invoices/id/inv-1",
    "/app/customers/clients/c-1",
    "/app/company/profile",
    "/app/settings/appearance",
    "/app/billing/plan",
    "/app/onboarding/wizard",
    "/app/legal/terms",
  ]) {
    expect(readingMeasure(path), path).toBe(true);
  }
});
