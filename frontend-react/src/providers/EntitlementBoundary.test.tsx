import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { useCreateClient } from "../hooks/queries";
import { BASE, COMPANY_ID, renderWithProvider } from "../test/utils";
import { EntitlementBoundary } from "./EntitlementBoundary";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** A component that knows nothing about plans, prices or 402s — which is the
 *  property under test. Every mutating screen in the product looks like this. */
function AddClient() {
  const create = useCreateClient();
  return (
    <button
      type="button"
      onClick={() => create.mutate({ company_id: COMPANY_ID, name: "Nieuwe BV" })}
    >
      Add client
    </button>
  );
}

function renderApp(onSeePlans?: () => void) {
  return renderWithProvider(
    <>
      <AddClient />
      <EntitlementBoundary onSeePlans={onSeePlans} />
    </>,
  );
}

test("a spent allowance opens the upgrade prompt with the server's numbers", async () => {
  server.use(
    http.post(`${BASE}/clients`, () =>
      HttpResponse.json(
        {
          error: "usage_limit_reached",
          required_tier: "starter",
          feature: "clients",
          message: "Your plan allows 10 clients.",
          limit: 10,
          used: 10,
          period: null,
        },
        { status: 402 },
      ),
    ),
    // The refusal is new information about usage, so the meters are refetched.
    http.get(`${BASE}/entitlements`, () =>
      HttpResponse.json({
        organization_id: "org-1",
        tier: "free",
        subscription_status: "active",
        features: {},
        usage: [],
      }),
    ),
  );

  renderApp();
  await userEvent.click(screen.getByRole("button", { name: "Add client" }));

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("Plan limit reached");
  // `feature` is a METER name here, so it reads as one.
  expect(dialog).toHaveTextContent("Clients");
  expect(dialog).toHaveTextContent("Your plan allows 10 clients.");
  expect(dialog).toHaveTextContent("Starter");
});

test("a missing capability reads as a feature, not a meter", async () => {
  server.use(
    http.post(`${BASE}/clients`, () =>
      HttpResponse.json(
        {
          error: "entitlement_required",
          required_tier: "business",
          feature: "roles_permissions",
          message: "Not included in your plan.",
        },
        { status: 402 },
      ),
    ),
    http.get(`${BASE}/entitlements`, () =>
      HttpResponse.json({
        organization_id: "org-1",
        tier: "free",
        subscription_status: "active",
        features: {},
        usage: [],
      }),
    ),
  );

  renderApp();
  await userEvent.click(screen.getByRole("button", { name: "Add client" }));

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("Not on your plan");
  expect(dialog).toHaveTextContent("Roles & permissions");
  // No allowance was spent, so no bar.
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

test("a 403 is not a price conversation", async () => {
  server.use(
    http.post(`${BASE}/clients`, () =>
      HttpResponse.json({ detail: "Forbidden" }, { status: 403 }),
    ),
  );

  renderApp();
  await userEvent.click(screen.getByRole("button", { name: "Add client" }));

  // Give the mutation a turn to settle before asserting the absence.
  expect(await screen.findByRole("button", { name: "Add client" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("See plans closes the dialog and hands the shell the navigation", async () => {
  const onSeePlans = vi.fn();
  server.use(
    http.post(`${BASE}/clients`, () =>
      HttpResponse.json(
        {
          error: "entitlement_required",
          required_tier: "business",
          feature: "multi_company",
          message: "Not included in your plan.",
        },
        { status: 402 },
      ),
    ),
    http.get(`${BASE}/entitlements`, () =>
      HttpResponse.json({
        organization_id: "org-1",
        tier: "free",
        subscription_status: "active",
        features: {},
        usage: [],
      }),
    ),
  );

  renderApp(onSeePlans);
  await userEvent.click(screen.getByRole("button", { name: "Add client" }));
  await userEvent.click(await screen.findByRole("button", { name: "See plans" }));

  expect(onSeePlans).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
