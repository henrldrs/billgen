import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, renderWithProvider } from "../test/utils";
import { ActivityPanel } from "./ActivityPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("renders audit entries", async () => {
  server.use(
    http.get(`${BASE}/activity`, () =>
      HttpResponse.json([
        {
          id: "a1",
          actor_user_id: "u1",
          action: "create",
          target_type: "invoice",
          target_id: "inv-1",
          before: null,
          after: { reference: "ACME-BC07012026" },
          timestamp: "2026-07-05T10:00:00Z",
        },
      ]),
    ),
  );

  renderWithProvider(<ActivityPanel />);
  expect(await screen.findByText("create")).toBeInTheDocument();
  expect(screen.getByText("invoice")).toBeInTheDocument();
});

test("shows empty state", async () => {
  server.use(http.get(`${BASE}/activity`, () => HttpResponse.json([])));

  renderWithProvider(<ActivityPanel />);
  expect(await screen.findByText(/No activity/)).toBeInTheDocument();
});
