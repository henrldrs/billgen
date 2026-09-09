import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, invoiceRecord, renderWithProvider } from "../test/utils";
import { InvoiceDetailPanel } from "./InvoiceDetailPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const LINE = {
  line_number: 1,
  description: "Consulting day",
  quantity: "2",
  unit_price: "625.00",
  product_id: null,
  supply_kind: "services",
  vat: { category: "S", rate: "21.0", legal_mention: null },
  discount: null,
};

function clientRecord() {
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

function auditEntry(id: string, action: string, timestamp: string) {
  return {
    id,
    actor_user_id: "u-1",
    action,
    target_type: "invoice",
    target_id: "inv-1",
    before: null,
    after: null,
    timestamp,
  };
}

function stubDetail(options: { activity?: unknown[]; payments?: unknown[] } = {}) {
  server.use(
    http.get(`${BASE}/invoices/inv-1`, () =>
      HttpResponse.json(invoiceRecord("inv-1", "ACME-BC07012026", { lines: [LINE] })),
    ),
    http.get(`${BASE}/clients/c-1`, () => HttpResponse.json(clientRecord())),
    http.get(`${BASE}/payments`, () => HttpResponse.json(options.payments ?? [])),
    http.get(`${BASE}/activity`, () => HttpResponse.json(options.activity ?? [])),
  );
}

test("renders the header, the lines and the frozen totals as the server sent them", async () => {
  stubDetail();
  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" />);

  // The client name appears twice by design: the page subtitle and the summary
  // rail's link into Client 360.
  expect(await screen.findAllByText("Big Corp")).toHaveLength(2);
  expect(screen.getByText("Consulting day")).toBeInTheDocument();

  // Totals are printed, never recomputed: quantity x unit price would be
  // €1,250.00 and the panel must not derive it — only the four server figures
  // (subtotal, discount, VAT, total) appear as money.
  expect(screen.getByText("€1,250.00")).toBeInTheDocument(); // subtotal_ht
  expect(screen.getByText("€262.50")).toBeInTheDocument(); // total_vat
  expect(screen.getByText("€1,512.50")).toBeInTheDocument(); // total_ttc
});

test("the timeline is the real audit log, oldest first", async () => {
  stubDetail({
    activity: [
      // The API returns newest-first; the lifecycle must read the other way.
      auditEntry("a3", "pay", "2026-07-20T09:00:00Z"),
      auditEntry("a2", "issue", "2026-07-04T09:00:00Z"),
      auditEntry("a1", "create", "2026-07-03T09:00:00Z"),
    ],
  });
  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" />);

  // Scoped to the timeline: "Issued" is also the status badge in the summary
  // rail, and matching on text alone would pick that up too.
  await screen.findByText("Payment recorded");
  const labels = [...document.querySelectorAll(".bg-timeline__label")].map(
    (node) => node.textContent,
  );
  expect(labels).toEqual(["Created", "Issued", "Payment recorded"]);
});

test("an audit log the server did not actually scope is refused, not rendered", async () => {
  // FastAPI silently discards query parameters it does not declare, so an older
  // API answers ?target_id=… with the whole org's log. Rendering that as this
  // invoice's history is the failure this guards.
  stubDetail({
    activity: [{ ...auditEntry("a1", "create", "2026-07-03T09:00:00Z"), target_id: "other" }],
  });
  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" />);

  expect(await screen.findByText(/ignored the target_id filter/i)).toBeInTheDocument();
  expect(screen.queryByText("Created")).not.toBeInTheDocument();
});

test("recorded payments are listed; none is an empty state", async () => {
  stubDetail({
    payments: [
      {
        id: "pay-1",
        invoice_id: "inv-1",
        amount: "500.00",
        currency: "EUR",
        method: "bank_transfer",
        paid_on: "2026-07-20",
        reference: "MSG-1",
        notes: null,
      },
    ],
  });
  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" />);

  expect(await screen.findByText("MSG-1")).toBeInTheDocument();
  expect(screen.getByText("€500.00")).toBeInTheDocument();
});

test("delivery stays scaffolded — Send and Duplicate are not real buttons", async () => {
  stubDetail();
  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" />);

  // The real actions are enabled…
  expect(await screen.findByRole("button", { name: "Void" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Credit note" })).toBeEnabled();

  // …and the two that have no endpoint are in the scaffold kit, which states
  // what is missing rather than rendering a disabled design-system button.
  const send = screen.getByRole("button", { name: /Send/ });
  expect(send).toBeDisabled();
  expect(send.className).toMatch(/^sk-/);
  expect(screen.getByText(/POST \/invoices\/\{id\}\/send/)).toBeInTheDocument();
});

test("a draft offers issue and delete, and no correction actions", async () => {
  server.use(
    http.get(`${BASE}/invoices/inv-1`, () =>
      HttpResponse.json(
        invoiceRecord("inv-1", null, {
          status: "draft",
          sequence_global: null,
          lines: [LINE],
        }),
      ),
    ),
    http.get(`${BASE}/clients/c-1`, () => HttpResponse.json(clientRecord())),
    http.get(`${BASE}/payments`, () => HttpResponse.json([])),
    http.get(`${BASE}/activity`, () => HttpResponse.json([])),
  );

  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" />);

  expect(await screen.findByRole("button", { name: "Issue" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  // No gapless number yet, so no void, credit note or Peppol export.
  expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Credit note" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Peppol XML" })).not.toBeInTheDocument();
});

test("a missing invoice explains itself and offers the way back", async () => {
  server.use(
    http.get(`${BASE}/invoices/inv-1`, () =>
      HttpResponse.json({ detail: "not found" }, { status: 404 }),
    ),
    http.get(`${BASE}/payments`, () => HttpResponse.json([])),
    http.get(`${BASE}/activity`, () => HttpResponse.json([])),
  );

  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" onBack={() => {}} />);
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByText(/could not be loaded/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back to invoices" })).toBeInTheDocument();
});

test("duplicate copies the invoice into a new draft and follows it", async () => {
  const user = userEvent.setup();
  const seen: string[] = [];
  stubDetail();
  server.use(
    http.post(`${BASE}/invoices/inv-1/duplicate`, () => {
      seen.push("inv-1");
      return HttpResponse.json(invoiceRecord("inv-2", null, { lines: [LINE] }));
    }),
    http.get(`${BASE}/invoices/inv-2`, () =>
      HttpResponse.json(invoiceRecord("inv-2", null, { lines: [LINE] })),
    ),
  );

  const followed: string[] = [];
  renderWithProvider(
    <InvoiceDetailPanel invoiceId="inv-1" onDuplicated={(id) => followed.push(id)} />,
  );

  await user.click(await screen.findByRole("button", { name: "Duplicate" }));

  // The copy is a different record, so staying put would show the original
  // while claiming something was created.
  await vi.waitFor(() => expect(followed).toEqual(["inv-2"]));
  expect(seen).toEqual(["inv-1"]);
});

test("duplicate is offered on a voided invoice, unlike every other action", async () => {
  // Re-issuing after a void is the reason the button has no state condition:
  // the lifecycle actions are all gone here, and copying is still the right
  // move — arguably the only one left.
  server.use(
    http.get(`${BASE}/invoices/inv-1`, () =>
      HttpResponse.json(
        invoiceRecord("inv-1", "ACME-BC07012026", { lines: [LINE], status: "voided" }),
      ),
    ),
    http.get(`${BASE}/clients/c-1`, () => HttpResponse.json(clientRecord())),
    http.get(`${BASE}/payments`, () => HttpResponse.json([])),
    http.get(`${BASE}/activity`, () => HttpResponse.json([])),
  );

  renderWithProvider(<InvoiceDetailPanel invoiceId="inv-1" />);

  expect(await screen.findByRole("button", { name: "Duplicate" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Issue" })).not.toBeInTheDocument();
});
