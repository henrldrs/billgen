/** Query-string construction for the filterable reads.
 *
 * These methods are the ones that changed shape (`listPayments` and
 * `listProducts` used to take a bare id), so the thing worth pinning is that a
 * caller passing nothing still hits the bare path, and that an id passed the
 * old way still lands in the right parameter. */

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { ApiClient, MemoryTokenStore } from "./apiClient";

const BASE = "http://api.test";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient() {
  const tokens = new MemoryTokenStore();
  tokens.set({ access_token: "access-0", refresh_token: "refresh-0" });
  return new ApiClient({ baseUrl: BASE, tokens });
}

/** Capture the query string of the next GET to `path`, answering with `body`. */
function captureGet(path: string, body: unknown) {
  const seen: { query: URLSearchParams | null } = { query: null };
  server.use(
    http.get(`${BASE}${path}`, ({ request }) => {
      seen.query = new URL(request.url).searchParams;
      return HttpResponse.json(body);
    }),
  );
  return seen;
}

test("listPayments with no filters asks for every payment", async () => {
  const seen = captureGet("/payments", []);
  await makeClient().listPayments({});
  expect([...(seen.query as URLSearchParams).keys()]).toEqual([]);
});

test("listPayments still accepts a bare invoice id", async () => {
  const seen = captureGet("/payments", []);
  await makeClient().listPayments("inv-1");
  expect(seen.query?.get("invoice_id")).toBe("inv-1");
});

test("listPayments sends every filter it was given", async () => {
  const seen = captureGet("/payments", []);
  await makeClient().listPayments({
    companyId: "co-1",
    clientId: "cl-1",
    paidFrom: "2026-07-01",
    paidTo: "2026-09-30",
  });
  expect(seen.query?.get("company_id")).toBe("co-1");
  expect(seen.query?.get("client_id")).toBe("cl-1");
  expect(seen.query?.get("paid_from")).toBe("2026-07-01");
  expect(seen.query?.get("paid_to")).toBe("2026-09-30");
  expect(seen.query?.has("invoice_id")).toBe(false);
});

test("listProducts still accepts a bare company id, and takes the new filters", async () => {
  const bare = captureGet("/products", []);
  await makeClient().listProducts("co-1");
  expect(bare.query?.get("company_id")).toBe("co-1");

  const filtered = captureGet("/products", []);
  await makeClient().listProducts({ companyId: "co-1", status: "archived" });
  expect(filtered.query?.get("status")).toBe("archived");
});

test("invoiceReport omits period when the caller wants all time", async () => {
  const seen = captureGet("/reports/invoices", { company_id: "co-1", statuses: [] });
  await makeClient().invoiceReport("co-1");
  expect(seen.query?.get("company_id")).toBe("co-1");
  expect(seen.query?.has("period")).toBe(false);
});

test("client stats and timeline are addressed by client id", async () => {
  const stats = captureGet("/clients/cl-1/stats", { client_id: "cl-1" });
  await makeClient().clientStats("cl-1", "2026-08-15");
  expect(stats.query?.get("today")).toBe("2026-08-15");

  const timeline = captureGet("/clients/cl-1/timeline", []);
  await makeClient().clientTimeline("cl-1", 25);
  expect(timeline.query?.get("limit")).toBe("25");
});
