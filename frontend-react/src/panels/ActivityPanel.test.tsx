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
  // Audit actions are translated for display; "create" is the wire value.
  expect(await screen.findByText("Created")).toBeInTheDocument();
  expect(screen.getByText("Invoice")).toBeInTheDocument();
});

test("record kinds are words, not wire values, in the interface language", async () => {
  // T-46: the feed printed `document_template` and a bare `quote`.
  server.use(
    http.get(`${BASE}/activity`, () =>
      HttpResponse.json([
        {
          id: "a1",
          actor_user_id: "u1",
          action: "create",
          target_type: "document_template",
          target_id: "t-1",
          before: null,
          after: null,
          timestamp: "2026-07-05T10:00:00Z",
        },
        {
          id: "a2",
          actor_user_id: "u1",
          action: "create",
          target_type: "quote",
          target_id: "q-1",
          before: null,
          after: null,
          timestamp: "2026-07-05T11:00:00Z",
        },
      ]),
    ),
  );

  renderWithProvider(<ActivityPanel lang="nl" />);
  expect(await screen.findByText("Documentsjabloon")).toBeInTheDocument();
  expect(screen.getByText("Offerte")).toBeInTheDocument();
  expect(screen.queryByText("document_template")).not.toBeInTheDocument();
  expect(screen.queryByText("quote")).not.toBeInTheDocument();
});

test("shows empty state", async () => {
  server.use(http.get(`${BASE}/activity`, () => HttpResponse.json([])));

  renderWithProvider(<ActivityPanel />);
  expect(await screen.findByText(/No activity/)).toBeInTheDocument();
});
