import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, invoiceRecord, renderWithProvider } from "../test/utils";
import { PaymentsReportPanel } from "./PaymentsReportPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function paymentRecord(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    invoice_id: "inv-1",
    amount: "500.00",
    currency: "EUR",
    method: "bank_transfer",
    paid_on: "2026-08-04",
    reference: "COMM-001",
    notes: null,
    ...extra,
  };
}

function client() {
  return {
    id: "c-1",
    organization_id: "org-1",
    company_id: COMPANY_ID,
    name: "Big Corp",
    contact_person: null,
    email: null,
    phone: null,
    vat_number: null,
    address_line1: null,
    postal_code: null,
    city: null,
    country_code: "BE",
    is_business: true,
    notes: null,
  };
}

/** The headline's shape. Defaults deliberately do NOT match the rows any test
 *  renders: the point of the report endpoint is that the total belongs to the
 *  filter, not to the page, so a stub whose total equalled the visible sum
 *  could not tell the two apart. */
function paymentReport(extra: Record<string, unknown> = {}) {
  return {
    company_id: COMPANY_ID,
    period: null,
    period_start: null,
    period_end: null,
    currency: "EUR",
    methods: [],
    by_month: {},
    count_by_month: {},
    payment_count: 4,
    total: "900.00",
    // Distinct from every amount the rows render, for the same reason the
    // total is: the largest payment in the filter need not be on this page,
    // and a stub that collided with a row would let a row satisfy an
    // assertion about the headline.
    largest: "800.00",
    first_payment_on: "2026-08-01",
    last_payment_on: "2026-08-11",
    skipped_other_currency: 0,
    ...extra,
  };
}

function stub(
  payments: unknown[],
  asked?: URLSearchParams[],
  report: Record<string, unknown> = paymentReport(),
  reportAsked?: URLSearchParams[],
) {
  server.use(
    http.get(`${BASE}/payments`, ({ request }) => {
      asked?.push(new URL(request.url).searchParams);
      return HttpResponse.json(payments);
    }),
    http.get(`${BASE}/reports/payments`, ({ request }) => {
      reportAsked?.push(new URL(request.url).searchParams);
      return HttpResponse.json(report);
    }),
    http.get(`${BASE}/invoices`, () =>
      HttpResponse.json([invoiceRecord("inv-1", "ACME-BC07012026")]),
    ),
    http.get(`${BASE}/clients`, () => HttpResponse.json([client()])),
  );
}

test("lists payments across invoices, resolving each to its invoice and client", async () => {
  stub([paymentRecord("pay-1"), paymentRecord("pay-2", { amount: "250.00", paid_on: "2026-08-11" })]);
  renderWithProvider(<PaymentsReportPanel companyId={COMPANY_ID} />);

  // Two payments against the same invoice, so the reference appears on both rows.
  expect(await screen.findAllByText("ACME-BC07012026")).toHaveLength(2);
  expect(screen.getAllByText("Big Corp")).toHaveLength(2);
  expect(screen.getByText("€500.00")).toBeInTheDocument();
  expect(screen.getByText("€250.00")).toBeInTheDocument();
});

test("the total is the server's, not a sum of the rows on screen", async () => {
  // The two rendered rows sum to €750.00. That number must NOT appear: the
  // list is paginated in the browser, so summing it totals the visible page
  // rather than the filter — a different number, presented as if it were the
  // same one. The server says €900.00 over four payments, and €900.00 is what
  // a person reconciling a bank statement needs to see.
  stub([paymentRecord("pay-1"), paymentRecord("pay-2", { amount: "250.00" })]);
  renderWithProvider(<PaymentsReportPanel companyId={COMPANY_ID} />);

  expect(await screen.findByText("€900.00")).toBeInTheDocument();
  expect(screen.queryByText("€750.00")).not.toBeInTheDocument();
});

test("the headline asks for the same window the list is filtered by", async () => {
  // The whole reason the report endpoint grew paid_from/paid_to. If these two
  // calls could drift, the figure at the top would describe a different set of
  // payments from the rows underneath it and nothing on screen would say so.
  const listAsked: URLSearchParams[] = [];
  const reportAsked: URLSearchParams[] = [];
  stub([paymentRecord("pay-1")], listAsked, paymentReport(), reportAsked);
  renderWithProvider(<PaymentsReportPanel companyId={COMPANY_ID} />);

  await screen.findAllByText("ACME-BC07012026");

  expect(reportAsked[0]?.get("company_id")).toBe(COMPANY_ID);
  expect(reportAsked[0]?.get("paid_from")).toBe(listAsked[0]?.get("paid_from") ?? null);
  expect(reportAsked[0]?.get("paid_to")).toBe(listAsked[0]?.get("paid_to") ?? null);
  // A period would be a second, competing filter; the server refuses both.
  expect(reportAsked[0]?.get("period")).toBeNull();
});

test("a window holding another currency says so instead of looking complete", async () => {
  // Payments outside the company's default currency are counted, not summed.
  // Silence here would present a partial total as the whole of the window.
  stub(
    [paymentRecord("pay-1")],
    undefined,
    paymentReport({ skipped_other_currency: 3 }),
  );
  renderWithProvider(<PaymentsReportPanel companyId={COMPANY_ID} />);

  expect(await screen.findByText(/not counted — another currency/)).toBeInTheDocument();
});

test("the company scope reaches the server as a query parameter", async () => {
  const asked: URLSearchParams[] = [];
  stub([paymentRecord("pay-1")], asked);
  renderWithProvider(<PaymentsReportPanel companyId={COMPANY_ID} />);

  await screen.findAllByText("ACME-BC07012026");
  expect(asked[0]?.get("company_id")).toBe(COMPANY_ID);
  // No window picked yet, so neither bound is sent — an empty window is "all
  // payments", not "payments since the epoch".
  expect(asked[0]?.get("paid_from")).toBeNull();
  expect(asked[0]?.get("paid_to")).toBeNull();
});

test("a payment whose invoice is not in the list still renders", async () => {
  // The invoice list is a lookup, not a filter. A payment that cannot be
  // resolved is still a payment that happened, so it shows what it can.
  stub([paymentRecord("pay-9", { invoice_id: "99999999-aaaa-bbbb-cccc-dddddddddddd" })]);
  renderWithProvider(<PaymentsReportPanel companyId={COMPANY_ID} />);

  expect(await screen.findByText("99999999")).toBeInTheDocument();
  expect(screen.getByText("€500.00")).toBeInTheDocument();
});
