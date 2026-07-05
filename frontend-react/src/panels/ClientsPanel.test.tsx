import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { ApiClient, MemoryTokenStore } from "../lib/apiClient";
import { BillGenProvider } from "../providers/BillGenProvider";
import { ClientsPanel } from "./ClientsPanel";

const BASE = "http://api.test";
const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPanel(lang: "en" | "fr" = "en") {
  const tokens = new MemoryTokenStore();
  tokens.set({ access_token: "access", refresh_token: "refresh" });
  const client = new ApiClient({ baseUrl: BASE, tokens });
  return render(
    <BillGenProvider client={client}>
      <ClientsPanel companyId={COMPANY_ID} lang={lang} />
    </BillGenProvider>,
  );
}

function clientRecord(id: string, name: string, extra: Record<string, unknown> = {}) {
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
    ...extra,
  };
}

test("renders the client list from the API", async () => {
  server.use(
    http.get(`${BASE}/clients`, () =>
      HttpResponse.json([
        clientRecord("c1", "Big Corp", { vat_number: "BE0123456789" }),
        clientRecord("c2", "Zeta Works", { city: "Gent" }),
      ]),
    ),
  );

  renderPanel();
  expect(await screen.findByText("Big Corp")).toBeInTheDocument();
  expect(screen.getByText("Zeta Works")).toBeInTheDocument();
  expect(screen.getByText("BE0123456789")).toBeInTheDocument();
  expect(screen.getByText("Gent")).toBeInTheDocument();
});

test("shows the empty state when there are no clients", async () => {
  server.use(http.get(`${BASE}/clients`, () => HttpResponse.json([])));

  renderPanel();
  expect(
    await screen.findByText(/Add your first client/),
  ).toBeInTheDocument();
});

test("creates a client through the form and refreshes the list", async () => {
  const records = [clientRecord("c1", "Big Corp")];
  server.use(
    http.get(`${BASE}/clients`, () => HttpResponse.json(records)),
    http.post(`${BASE}/clients`, async ({ request }) => {
      const body = (await request.json()) as { name: string; company_id: string };
      expect(body.company_id).toBe(COMPANY_ID);
      const created = clientRecord("c2", body.name);
      records.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  );

  renderPanel();
  const user = userEvent.setup();

  await user.click(await screen.findByRole("button", { name: "Add client" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toBeInTheDocument();

  await user.type(screen.getByLabelText("Name"), "New Client NV");
  await user.click(screen.getByRole("button", { name: "Save" }));

  // list refetches and shows the new row; modal closes
  expect(await screen.findByText("New Client NV")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("renders in French", async () => {
  server.use(http.get(`${BASE}/clients`, () => HttpResponse.json([])));

  renderPanel("fr");
  expect(
    await screen.findByRole("button", { name: "Ajouter un client" }),
  ).toBeInTheDocument();
});

test("shows an error state when the API fails", async () => {
  server.use(
    http.get(`${BASE}/clients`, () =>
      HttpResponse.json({ detail: "boom" }, { status: 500 }),
    ),
  );

  renderPanel();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Something went wrong",
  );
});
