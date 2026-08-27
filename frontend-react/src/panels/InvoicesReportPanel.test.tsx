import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, renderWithProvider } from "../test/utils";
import { InvoicesReportPanel } from "./InvoicesReportPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function report(extra: Record<string, unknown> = {}) {
  return {
    company_id: COMPANY_ID,
    period: "2026-Q3",
    period_start: "2026-07-01",
    period_end: "2026-09-30",
    currency: "EUR",
    statuses: [
      { status: "paid", count: 4, total_ttc: "4000.00" },
      { status: "overdue", count: 2, total_ttc: "1500.00" },
      { status: "draft", count: 1, total_ttc: "0.00" },
    ],
    by_month: { "2026-07": "3000.00", "2026-08": "2500.00" },
    count_by_month: { "2026-07": 3, "2026-08": 3 },
    invoice_count: 7,
    invoiced_total: "5500.00",
    paid_total: "4000.00",
    outstanding_total: "1500.00",
    draft_count: 1,
    overdue_count: 2,
    overdue_total: "1500.00",
    skipped_other_currency: 0,
    ...extra,
  };
}

function stub(body: Record<string, unknown> = report(), asked?: URLSearchParams[]) {
  server.use(
    http.get(`${BASE}/reports/invoices`, ({ request }) => {
      asked?.push(new URL(request.url).searchParams);
      return HttpResponse.json(body);
    }),
  );
}

test("every figure comes from /reports/invoices, not from counting rows", async () => {
  const asked: URLSearchParams[] = [];
  stub(report(), asked);
  renderWithProvider(<InvoicesReportPanel companyId={COMPANY_ID} period="2026-Q3" />);

  expect(await screen.findByText("€5,500.00")).toBeInTheDocument(); // invoiced_total
  expect(screen.getAllByText("€4,000.00").length).toBeGreaterThan(0); // paid_total
  expect(screen.getAllByText("€1,500.00").length).toBeGreaterThan(0); // outstanding + overdue

  // One request, to the aggregate endpoint. Never /invoices — a screen that
  // fetched rows would be one page away from disagreeing with the PDF.
  expect(asked).toHaveLength(1);
  expect(asked[0]?.get("period")).toBe("2026-Q3");
  expect(asked[0]?.get("company_id")).toBe(COMPANY_ID);
});

test("the status buckets are the server's, overdue included", async () => {
  // "overdue" is an EFFECTIVE status derived from the due date at request time.
  // No invoice row holds it, so it can only come from the endpoint.
  stub();
  renderWithProvider(<InvoicesReportPanel companyId={COMPANY_ID} period="2026-Q3" />);

  expect(await screen.findByText("overdue")).toBeInTheDocument();
  // Badge prints the canonical label for a lifecycle status, and a raw tone for
  // "overdue", which the design system has no colour for. "Paid" is also a KPI
  // label on this screen, so the assertion is on the badge specifically.
  expect(
    screen.getAllByText("Paid").some((element) => element.className.includes("bg-badge")),
  ).toBe(true);
});

test("drafts are counted but explained, not folded into a total", async () => {
  stub();
  renderWithProvider(<InvoicesReportPanel companyId={COMPANY_ID} period="2026-Q3" />);

  expect(await screen.findByText("Drafts")).toBeInTheDocument();
  expect(screen.getByText(/no number and is owed by nobody/)).toBeInTheDocument();
});

test("invoices in another currency are declared, never silently dropped", async () => {
  // The failure this prevents is a right-looking wrong number: a total in EUR
  // that quietly excluded three USD invoices.
  stub(report({ skipped_other_currency: 3 }));
  renderWithProvider(<InvoicesReportPanel companyId={COMPANY_ID} period="2026-Q3" />);

  expect(await screen.findByText(/Invoices in another currency were left out/)).toBeInTheDocument();
  expect(screen.getByText(/^3 · /)).toBeInTheDocument();
});

test("the monthly series is printed as sent, count beside money", async () => {
  stub();
  renderWithProvider(<InvoicesReportPanel companyId={COMPANY_ID} period="2026-Q3" />);

  expect(await screen.findByText("July 2026")).toBeInTheDocument();
  expect(screen.getByText("August 2026")).toBeInTheDocument();
  expect(screen.getByText("€3,000.00")).toBeInTheDocument();
  expect(screen.getByText("€2,500.00")).toBeInTheDocument();
});
