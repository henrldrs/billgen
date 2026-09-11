import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, invoiceRecord, renderWithProvider } from "../test/utils";
import { Client360Panel } from "./Client360Panel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const CLIENT_ID = "22222222-2222-2222-2222-222222222222";

const CLIENT = {
  id: CLIENT_ID,
  organization_id: "org-1",
  company_id: COMPANY_ID,
  name: "Big Corp",
  contact_person: "Marie Dupont",
  email: "marie@bigcorp.be",
  phone: "+32 2 555 01 02",
  vat_number: "BE9876543265",
  address_line1: "Grote Markt 5",
  postal_code: "2000",
  city: "Antwerpen",
  country_code: "BE",
  is_business: true,
  notes: null,
};

const STATS = {
  client_id: CLIENT_ID,
  company_id: COMPANY_ID,
  currency: "EUR",
  invoice_count: 3,
  draft_count: 0,
  invoiced_total: "1512.50",
  paid_total: "1000.00",
  outstanding_total: "512.50",
  credited_total: "0.00",
  credit_note_count: 0,
  overdue_count: 1,
  overdue_total: "512.50",
  first_invoice_date: "2026-07-04",
  last_invoice_date: "2026-07-04",
  average_days_to_payment: 12,
  skipped_other_currency: 0,
};

/** The happy path: client found, one invoice, one audit entry. Each handler
 *  asserts the filter actually reached the wire — the whole point of this
 *  screen is that the server does the narrowing, not the browser. */
function mountHandlers(options: { seenInvoiceQuery?: (value: string | null) => void } = {}) {
  server.use(
    http.get(`${BASE}/clients/${CLIENT_ID}`, () => HttpResponse.json(CLIENT)),
    http.get(`${BASE}/clients/${CLIENT_ID}/stats`, () => HttpResponse.json(STATS)),
    http.get(`${BASE}/invoices`, ({ request }) => {
      const url = new URL(request.url);
      options.seenInvoiceQuery?.(url.searchParams.get("client_id"));
      return HttpResponse.json([invoiceRecord("inv-1", "ACME-BC07012026")]);
    }),
    http.get(`${BASE}/activity`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("target_id") !== CLIENT_ID) return HttpResponse.json([]);
      return HttpResponse.json([
        {
          id: "a1",
          actor_user_id: "u1",
          action: "create",
          target_type: "client",
          target_id: CLIENT_ID,
          before: null,
          after: null,
          timestamp: "2026-07-05T10:00:00Z",
        },
      ]);
    }),
  );
}

test("identity comes from the server, not from the list the user came through", async () => {
  mountHandlers();
  renderWithProvider(<Client360Panel clientId={CLIENT_ID} />);

  expect(await screen.findByRole("heading", { name: "Big Corp" })).toBeInTheDocument();
  expect(screen.getByText("BE9876543265")).toBeInTheDocument();
  expect(screen.getByText(/Grote Markt 5/)).toBeInTheDocument();
  expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
});

test("invoice history asks the server for this client only", async () => {
  let seen: string | null = "not-called";
  mountHandlers({ seenInvoiceQuery: (value) => (seen = value) });
  renderWithProvider(<Client360Panel clientId={CLIENT_ID} />);

  expect(await screen.findByText("ACME-BC07012026")).toBeInTheDocument();
  expect(seen).toBe(CLIENT_ID);
});

test("the audit trail is scoped to this client", async () => {
  mountHandlers();
  renderWithProvider(<Client360Panel clientId={CLIENT_ID} />);

  // The handler returns nothing unless target_id was sent, so finding the
  // entry IS the assertion that the parameter went out.
  expect(await screen.findByText("create")).toBeInTheDocument();
  // And the card says what it actually is, not "History".
  expect(screen.getByText(/Invoices and payments are not here/)).toBeInTheDocument();
});

test("everything without a backend renders as scaffold, never as data", async () => {
  mountHandlers();
  renderWithProvider(<Client360Panel clientId={CLIENT_ID} />);
  await screen.findByRole("heading", { name: "Big Corp" });

  // Tags, risk flags and GDPR each carry the scaffold banner and name the
  // model that is missing. A regression that "helpfully" fills these with
  // placeholder chips would drop the banner and fail here.
  const tags = screen.getByRole("region", { name: /Tags & groups/ });
  expect(within(tags).getByText("ClientGroup model")).toBeInTheDocument();

  const risk = screen.getByRole("region", { name: /Risk flags/ });
  // The endpoint exists as of 2026-08-28; the risk signals on it do not, and
  // the chip names the half that is still missing rather than the whole thing.
  expect(
    within(risk).getByText("risk signals on GET /reports/clients"),
  ).toBeInTheDocument();

  // The totals are the server's, not a sum of the visible rows: the four
  // figures come from GET /clients/{id}/stats and print as money.
  // Awaited: the heading resolves off the client fetch, the strip off its own.
  expect(await screen.findByText("Invoiced")).toBeInTheDocument();
  // The same amount is also the one invoice's row total, so look in the strip.
  const strip = document.querySelector(".bg-kpi-grid");
  if (!strip) throw new Error("the totals strip did not render");
  expect(within(strip as HTMLElement).getByText("€1,512.50")).toBeInTheDocument();
  expect(within(strip as HTMLElement).getByText("Overdue")).toBeInTheDocument();
  expect(screen.queryByText("GET /clients/{id}/stats")).not.toBeInTheDocument();

  const gdpr = screen.getByRole("region", { name: /GDPR/ });
  // Dead controls are disabled, not merely unstyled.
  expect(within(gdpr).getByRole("button", { name: "Export data" })).toBeDisabled();
});

test("the quotes and documents tabs are scaffolds behind real tabs", async () => {
  mountHandlers();
  renderWithProvider(<Client360Panel clientId={CLIENT_ID} />);
  await screen.findByText("ACME-BC07012026");

  await userEvent.click(screen.getByRole("tab", { name: /Documents/ }));
  const documents = screen.getByRole("region", { name: /Documents for this client/ });
  expect(within(documents).getByText("Document model")).toBeInTheDocument();
  expect(within(documents).getByRole("button", { name: "Upload" })).toBeDisabled();

  // Switching away does not leave the real invoice table mounted underneath.
  expect(screen.queryByText("ACME-BC07012026")).not.toBeInTheDocument();
});

test("a stale API that ignores target_id is caught, not rendered as truth", async () => {
  // FastAPI discards query parameters it does not declare, so an older API
  // answers ?target_id=… with the whole organization's log. Rendering that as
  // "this client's activity" is the exact failure the screen must not have.
  server.use(
    http.get(`${BASE}/clients/${CLIENT_ID}`, () => HttpResponse.json(CLIENT)),
    http.get(`${BASE}/invoices`, () => HttpResponse.json([])),
    http.get(`${BASE}/activity`, () =>
      HttpResponse.json([
        {
          id: "a1",
          actor_user_id: "u1",
          action: "login",
          target_type: "user",
          target_id: "99999999-9999-9999-9999-999999999999",
          before: null,
          after: null,
          timestamp: "2026-08-26T09:50:39Z",
        },
      ]),
    ),
  );

  renderWithProvider(<Client360Panel clientId={CLIENT_ID} />);
  await screen.findByRole("heading", { name: "Big Corp" });

  expect(await screen.findByText(/ignored the target_id filter/)).toBeInTheDocument();
  // The unrelated entry must not appear anywhere on the screen.
  expect(screen.queryByText("login")).not.toBeInTheDocument();
});

test("a client that does not exist says so instead of rendering an empty shell", async () => {
  server.use(
    http.get(`${BASE}/clients/${CLIENT_ID}`, () =>
      HttpResponse.json({ detail: "Not found" }, { status: 404 }),
    ),
    http.get(`${BASE}/invoices`, () => HttpResponse.json([])),
    http.get(`${BASE}/activity`, () => HttpResponse.json([])),
  );

  renderWithProvider(<Client360Panel clientId={CLIENT_ID} />);
  expect(await screen.findByText(/does not exist/)).toBeInTheDocument();
});
