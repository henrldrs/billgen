import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, invoiceRecord, isoDaysFromToday, renderWithProvider } from "../test/utils";
import { ReceivablesPanel } from "./ReceivablesPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const KPI = {
  invoiced_total: "9000.00",
  paid_total: "4000.00",
  outstanding_total: "5000.00",
  counts: { issued: 1, partially_paid: 1 },
  overdue_count: 2,
};

function clientRecord(id: string, name: string) {
  return {
    id,
    organization_id: "org-1",
    company_id: COMPANY_ID,
    name,
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

/** Answer /invoices from the status parameter, recording what was asked for. */
function statusRouter(seen: string[], byStatus: Record<string, unknown[]>) {
  return http.get(`${BASE}/invoices`, ({ request }) => {
    const status = new URL(request.url).searchParams.get("status") ?? "";
    seen.push(status);
    return HttpResponse.json(byStatus[status] ?? []);
  });
}

test("outstanding asks the server for issued and partially paid, and nothing else", async () => {
  const seen: string[] = [];
  server.use(
    http.get(`${BASE}/reports/kpi`, () => HttpResponse.json(KPI)),
    http.get(`${BASE}/clients`, () => HttpResponse.json([clientRecord("c-1", "Big Corp")])),
    statusRouter(seen, {
      issued: [invoiceRecord("inv-1", "ACME-0001")],
      partially_paid: [
        invoiceRecord("inv-2", "ACME-0002", { status: "partially_paid" }),
      ],
    }),
  );

  renderWithProvider(<ReceivablesPanel companyId={COMPANY_ID} mode="outstanding" />);

  const table = within(await screen.findByRole("table"));
  expect(await table.findByText("ACME-0001")).toBeInTheDocument();
  expect(table.getByText("ACME-0002")).toBeInTheDocument();
  // The client name comes from /clients, indexed once rather than per row.
  expect(table.getAllByText("Big Corp")).toHaveLength(2);

  // The whole point of this screen: filtering happens on the server. An
  // unfiltered request would mean the browser is doing the work.
  await waitFor(() => expect(new Set(seen)).toEqual(new Set(["issued", "partially_paid"])));
});

test("overdue asks only for overdue and never for the unfiltered list", async () => {
  const seen: string[] = [];
  server.use(
    http.get(`${BASE}/reports/kpi`, () => HttpResponse.json(KPI)),
    http.get(`${BASE}/clients`, () => HttpResponse.json([clientRecord("c-1", "Big Corp")])),
    statusRouter(seen, {
      // What the server answers for ?status=overdue since T-51: the stored
      // status, with the due date the screen counts from.
      overdue: [
        invoiceRecord("inv-3", "ACME-0003", {
          status: "issued",
          effective_status: "overdue",
          due_date: isoDaysFromToday(-43),
        }),
      ],
    }),
  );

  renderWithProvider(<ReceivablesPanel companyId={COMPANY_ID} mode="overdue" />);

  const table = within(await screen.findByRole("table"));
  expect(await table.findByText("ACME-0003")).toBeInTheDocument();
  // Badge has no colour for OVERDUE, so it renders as a warn-toned tag, and
  // it carries the age rather than the word "issued" the wire sent.
  expect(table.getByText("Overdue · 43 days")).toBeInTheDocument();
  expect(seen).not.toContain("");
  expect(new Set(seen)).toEqual(new Set(["overdue"]));
});

test("nothing outstanding is an empty state, not a blank table", async () => {
  server.use(
    http.get(`${BASE}/reports/kpi`, () => HttpResponse.json(KPI)),
    http.get(`${BASE}/clients`, () => HttpResponse.json([])),
    statusRouter([], {}),
  );

  renderWithProvider(<ReceivablesPanel companyId={COMPANY_ID} mode="outstanding" />);
  expect(await screen.findByText(/Every issued invoice has been paid/)).toBeInTheDocument();
});
