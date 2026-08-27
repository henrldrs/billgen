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

function stub(payments: unknown[], asked?: URLSearchParams[]) {
  server.use(
    http.get(`${BASE}/payments`, ({ request }) => {
      asked?.push(new URL(request.url).searchParams);
      return HttpResponse.json(payments);
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

test("prints no total — the sum is the server's job, and it has no endpoint yet", async () => {
  // €750.00 is what a browser-side sum of the two rows would show. It must not
  // appear: money arithmetic does not live in a React component, and a sum
  // across currencies would be wrong rather than merely misplaced.
  stub([paymentRecord("pay-1"), paymentRecord("pay-2", { amount: "250.00" })]);
  renderWithProvider(<PaymentsReportPanel companyId={COMPANY_ID} />);

  expect(await screen.findByText("€500.00")).toBeInTheDocument();
  expect(screen.queryByText("€750.00")).not.toBeInTheDocument();
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
