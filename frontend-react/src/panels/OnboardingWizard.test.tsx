/** The guided first run (T-29), as a screen. The truth is the server's, so
 *  these assert what the screen does with each answer `GET /onboarding` can
 *  give — not a step counter of its own. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router-dom";

import { BASE, renderWithProvider } from "../test/utils";
import { OnboardingWizard } from "./OnboardingWizard";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

function status(overrides: Record<string, unknown> = {}) {
  return {
    completed_at: null,
    //  A first run that has already been through the profile step; the tests
    //  that care about it override these.
    display_name: "Emilia Rossi",
    organization_name: "Rossi Consulting",
    profile_complete: true,
    company_id: null,
    company_valid: false,
    company_problems: [],
    required_texts: [],
    clients: 0,
    products: 0,
    data_directory: "C:\\Users\\emilia\\Documents\\BillGen",
    documents_enabled: true,
    can_complete: false,
    blockers: ["no company"],
    ...overrides,
  };
}

function mount(current: Record<string, unknown>) {
  const state = { current };
  server.use(
    http.get(`${BASE}/onboarding`, () => HttpResponse.json(state.current)),
  );
  renderWithProvider(
    <MemoryRouter>
      <OnboardingWizard />
    </MemoryRouter>,
  );
  return state;
}

test("with no company the company step offers the form and the last step names the blocker", async () => {
  mount(status());
  await screen.findByRole("heading", { name: "Welcome to BillGen" });

  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText(/Your name and what you call your business/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText(/mandatory mentions come from here/)).toBeInTheDocument();

  //  Jump to the end: the server said "no company", the screen says so and
  //  offers no finish button.
  for (let i = 0; i < 3; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }
  const blocked = screen.getByRole("alert");
  expect(within(blocked).getByText("a company")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Finish setup" })).not.toBeInTheDocument();
  expect(screen.getByText(/Documents\\BillGen/)).toBeInTheDocument();
});

test("a company that fails validation is named by field, and cannot finish", async () => {
  mount(
    status({
      company_id: COMPANY_ID,
      company_valid: false,
      company_problems: ["vat_number"],
      blockers: ["company: vat_number"],
    }),
  );
  await screen.findByRole("heading", { name: "Welcome to BillGen" });
  for (let i = 0; i < 2; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }

  expect(screen.getByText("Fix these before the first invoice:")).toBeInTheDocument();
  expect(screen.getByText("vat_number")).toBeInTheDocument();
  expect(screen.queryByText("Identifiers check out.")).not.toBeInTheDocument();
});

test("the legal step lists published texts, accepts one, and re-reads the server", async () => {
  const state = mount(
    status({
      company_id: COMPANY_ID,
      company_valid: true,
      required_texts: [{ key: "terms", title: "Terms of Service", version: "1.0", accepted: false }],
      blockers: ["accept: terms"],
    }),
  );
  server.use(
    http.post(`${BASE}/onboarding/acceptances`, async ({ request }) => {
      const body = (await request.json()) as { key: string };
      expect(body.key).toBe("terms");
      state.current = {
        ...state.current,
        required_texts: [{ key: "terms", title: "Terms of Service", version: "1.0", accepted: true }],
        can_complete: true,
        blockers: [],
      };
      return HttpResponse.json(
        { id: "a1", document_key: "terms", version: "1.0", source: "onboarding", document_id: "d1", created_at: "2026-09-11T12:00:00Z" },
        { status: 201 },
      );
    }),
  );
  await screen.findByRole("heading", { name: "Welcome to BillGen" });
  for (let i = 0; i < 3; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }

  expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "I have read and accept" }));
  expect(await screen.findByText("Accepted")).toBeInTheDocument();
});

test("with nothing published the legal step says so instead of inventing a checkbox", async () => {
  mount(status({ company_id: COMPANY_ID, company_valid: true, can_complete: true, blockers: [] }));
  await screen.findByRole("heading", { name: "Welcome to BillGen" });
  for (let i = 0; i < 3; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }
  expect(screen.getByText("No text requires your acceptance yet.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "I have read and accept" })).not.toBeInTheDocument();
});

test("finishing asks the server, and a finished run offers the first invoice", async () => {
  const state = mount(status({ company_id: COMPANY_ID, company_valid: true, can_complete: true, blockers: [] }));
  server.use(
    http.post(`${BASE}/onboarding/complete`, () => {
      state.current = { ...state.current, completed_at: "2026-09-11T12:00:00Z" };
      return HttpResponse.json(state.current);
    }),
  );
  await screen.findByRole("heading", { name: "Welcome to BillGen" });
  //  Upcoming steps are not clickable in the Stepper — only completed ones
  //  are — so the way to the end is Next, once per step.
  for (let i = 0; i < 5; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }

  await userEvent.click(screen.getByRole("button", { name: "Finish setup" }));
  expect(await screen.findByRole("button", { name: "Create my first invoice" })).toBeInTheDocument();
  expect(screen.getByText(/assigned the moment you issue it/)).toBeInTheDocument();
});


test("the placeholder identity a desktop install starts with blocks the finish", async () => {
  //  What `POST /auth/desktop-bootstrap` mints: nobody typed either name, and
  //  a contract accepted by "Local user" for "My Business" names nobody.
  const state = mount(
    status({
      display_name: "Local user",
      organization_name: "My Business",
      profile_complete: false,
      company_id: COMPANY_ID,
      company_valid: true,
      can_complete: false,
      blockers: ["profile"],
    }),
  );
  server.use(
    http.patch(`${BASE}/users/me`, () => HttpResponse.json({ display_name: "Emilia Rossi" })),
    http.patch(`${BASE}/orgs/current`, async ({ request }) => {
      const body = (await request.json()) as { name: string };
      state.current = {
        ...state.current,
        display_name: "Emilia Rossi",
        organization_name: body.name,
        profile_complete: true,
        can_complete: true,
        blockers: [],
      };
      return HttpResponse.json({ id: "org-1", name: body.name, country_code: "BE", plan_tier: "free" });
    }),
  );
  await screen.findByRole("heading", { name: "Welcome to BillGen" });

  //  The last step refuses, and names the profile rather than saying "invalid".
  for (let i = 0; i < 5; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }
  expect(
    within(screen.getByRole("alert")).getByText("your name and your business name"),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Finish setup" })).not.toBeInTheDocument();

  //  Fill it in, and the finish appears. Completed steps in the Stepper are
  //  buttons, so the way back is the step itself.
  await userEvent.click(screen.getByRole("button", { name: /Who you are/ }));
  await userEvent.clear(screen.getByLabelText(/Your name/));
  await userEvent.type(screen.getByLabelText(/Your name/), "Emilia Rossi");
  await userEvent.clear(screen.getByLabelText(/Your business/));
  await userEvent.type(screen.getByLabelText(/Your business/), "Rossi Consulting");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  //  Back on the profile step, so four remain to the end.
  for (let i = 0; i < 4; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }
  expect(await screen.findByRole("button", { name: "Finish setup" })).toBeInTheDocument();
});
