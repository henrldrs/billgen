/** The account screen edits the two names the first run asks for, through
 *  the same two calls, and shows the e-mail without letting it be changed. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect, test } from "vitest";

import { BASE, renderWithProvider } from "../test/utils";
import { AccountPanel } from "./AccountPanel";

const server = setupServer(
  http.get(`${BASE}/users/me`, () =>
    HttpResponse.json({
      id: "u1",
      email: "emilia@example.be",
      display_name: "Local user",
      language: null,
      organization_id: "org-1",
      role: "owner",
      permissions: [],
    }),
  ),
  http.get(`${BASE}/orgs/current`, () =>
    HttpResponse.json({ id: "org-1", name: "My Business", country_code: "BE", plan_tier: "partner" }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("renders the record, sends only what changed, and keeps the e-mail read-only", async () => {
  let me: unknown = null;
  let org: unknown = null;
  server.use(
    http.patch(`${BASE}/users/me`, async ({ request }) => {
      me = await request.json();
      return HttpResponse.json({
        id: "u1",
        email: "emilia@example.be",
        display_name: "Emilia Rossi",
        language: null,
        organization_id: "org-1",
        role: "owner",
        permissions: [],
      });
    }),
    http.patch(`${BASE}/orgs/current`, async ({ request }) => {
      org = await request.json();
      return HttpResponse.json({ id: "org-1", name: "Rossi Consulting", country_code: "BE", plan_tier: "partner" });
    }),
  );

  renderWithProvider(<AccountPanel />);

  const name = await screen.findByDisplayValue("Local user");
  expect(screen.getByDisplayValue("emilia@example.be")).toBeDisabled();
  expect(screen.getByText("owner")).toBeInTheDocument();
  const save = screen.getByRole("button", { name: "Save" });
  expect(save).toBeDisabled();

  await userEvent.clear(name);
  await userEvent.type(name, "Emilia Rossi");
  expect(save).toBeEnabled();
  await userEvent.click(save);

  await waitFor(() => expect(me).toEqual({ display_name: "Emilia Rossi" }));
  //  The organization was not touched, so it was not sent.
  expect(org).toBeNull();
  expect(await screen.findByText("Saved")).toBeInTheDocument();

  const business = screen.getByDisplayValue("My Business");
  await userEvent.clear(business);
  await userEvent.type(business, "Rossi Consulting");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(org).toEqual({ name: "Rossi Consulting" }));
});
