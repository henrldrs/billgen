import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, renderWithProvider } from "../test/utils";
import { PlansPanel } from "./PlansPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const PLANS = {
  tiers: [
    {
      tier: "free",
      quotas: [{ meter: "invoices", limit: 10 }],
      features: { credit_notes: true, team_administration: false },
    },
    {
      tier: "business_pro",
      quotas: [
        { meter: "invoices", limit: 1000 },
        // Only the top tier reports this meter, so the row must still exist
        // for Free — showing an em dash, not a silently missing line.
        { meter: "seats", limit: null },
      ],
      // Only the top tier declares this feature; Free must still get a cell.
      features: { credit_notes: true, team_administration: true, priority_support: true },
    },
  ],
};

function useEntitlements(tier: string) {
  return http.get(`${BASE}/entitlements`, () =>
    HttpResponse.json({
      organization_id: "org-1",
      tier,
      subscription_status: "active",
      features: {},
      usage: [],
    }),
  );
}

test("renders one column per tier, in the order the server sent", async () => {
  server.use(
    http.get(`${BASE}/plans`, () => HttpResponse.json(PLANS)),
    useEntitlements("free"),
  );

  renderWithProvider(<PlansPanel />);

  const headers = await screen.findAllByRole("columnheader");
  expect(headers.map((cell) => cell.textContent)).toEqual([
    "",
    "FreeYour plan",
    "Business Pro",
  ]);
});

test("a row exists for every meter and feature any tier mentions", async () => {
  server.use(
    http.get(`${BASE}/plans`, () => HttpResponse.json(PLANS)),
    useEntitlements("free"),
  );

  renderWithProvider(<PlansPanel />);

  // Declared by Business Pro only; Free's cell says so rather than being blank.
  const row = (await screen.findByText("Team administration")).closest("tr");
  expect(row).not.toBeNull();
  expect(within(row as HTMLElement).getByText("Not included")).toBeInTheDocument();
  expect(within(row as HTMLElement).getByText("Included")).toBeInTheDocument();

  // A meter only the top tier reports: unlimited there, absent for Free.
  const seats = (screen.getByText("Users")).closest("tr") as HTMLElement;
  expect(within(seats).getByText("Unlimited")).toBeInTheDocument();
  expect(within(seats).getByText("—")).toBeInTheDocument();
});

test("the current tier is the one marked", async () => {
  server.use(
    http.get(`${BASE}/plans`, () => HttpResponse.json(PLANS)),
    useEntitlements("business_pro"),
  );

  renderWithProvider(<PlansPanel />);

  const marked = await screen.findByText("Your plan");
  expect(marked.closest("th")?.textContent).toBe("Business ProYour plan");
});
