/** T-29's permanent half. The data directory is the server's resolved path,
 *  the register is the server's, and the texts' state is the server's — the
 *  screen asserts what it does with each. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect, test, vi } from "vitest";

import { BASE, renderWithProvider } from "../test/utils";
import { DataPrivacyPanel } from "./DataPrivacyPanel";

const REGISTER = {
  datasets: [
    {
      key: "clients",
      label: "Client records",
      subject: "your clients",
      fields: ["name", "vat_number", "email"],
      purpose: "Issuing invoices",
      basis: "CONTRACT",
      retention: "7 years after the last invoice",
      exportable: true,
      erasure: "PARTIAL",
      source: null,
      note: null,
    },
  ],
  retained_on_erasure: ["Issued invoices, seven years (Belgian bookkeeping law)"],
  subprocessors: [{ name: "Vercel", purpose: "Hosting the marketing site", location: "EU", in_use: false }],
};

const DOCUMENTS = [
  {
    key: "terms",
    title: "Terms of Service",
    ia_path: "legal/terms",
    audience: "customer",
    requires_acceptance: true,
    drafted: true,
    version: "1.0",
    effective_date: "2026-09-01",
    blocks: [],
    note: null,
  },
  {
    key: "privacy",
    title: "Privacy Policy",
    ia_path: "legal/privacy",
    audience: "customer",
    requires_acceptance: false,
    drafted: false,
    version: null,
    effective_date: null,
    blocks: [],
    note: null,
  },
];

function onboarding(overrides: Record<string, unknown> = {}) {
  return {
    completed_at: "2026-09-12T10:00:00Z",
    display_name: "Emilia Rossi",
    organization_name: "Rossi Consulting",
    profile_complete: true,
    company_id: "c1",
    company_valid: true,
    company_problems: [],
    required_texts: [{ key: "terms", title: "Terms of Service", version: "1.0", accepted: false }],
    clients: 1,
    products: 1,
    data_directory: "C:\\Users\\emilia\\Documents\\BillGen",
    documents_enabled: true,
    can_complete: true,
    blockers: [],
    ...overrides,
  };
}

const server = setupServer(
  http.get(`${BASE}/trust/privacy/register`, () => HttpResponse.json(REGISTER)),
  http.get(`${BASE}/trust/legal/documents`, () => HttpResponse.json(DOCUMENTS)),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("shows the resolved folder, what it holds, the register and who receives nothing", async () => {
  server.use(http.get(`${BASE}/onboarding`, () => HttpResponse.json(onboarding())));
  const onOpenBackup = vi.fn();

  renderWithProvider(<DataPrivacyPanel onOpenBackup={onOpenBackup} />);

  expect(await screen.findByText(/Documents\\BillGen/)).toBeInTheDocument();
  expect(screen.getByText("invoices/")).toBeInTheDocument();
  expect(screen.getByText("Client records")).toBeInTheDocument();
  expect(screen.getByText("7 years after the last invoice")).toBeInTheDocument();
  expect(screen.getByText(/Issued invoices, seven years/)).toBeInTheDocument();
  //  A subprocessor that is not in use is not listed as receiving anything.
  expect(screen.queryByText(/Vercel/)).not.toBeInTheDocument();
  expect(screen.getByText(/Nobody\./)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Backup & restore" }));
  expect(onOpenBackup).toHaveBeenCalledOnce();
});

test("a hosted account has no folder and says so", async () => {
  server.use(http.get(`${BASE}/onboarding`, () => HttpResponse.json(onboarding({ data_directory: null }))));
  renderWithProvider(<DataPrivacyPanel />);
  expect(await screen.findByText(/This account is hosted/)).toBeInTheDocument();
  expect(screen.queryByText("invoices/")).not.toBeInTheDocument();
});

test("texts show their state, and accepting one from here says so to the server", async () => {
  const state = { current: onboarding() };
  let sent: { key: string; source: string } | null = null;
  server.use(
    http.get(`${BASE}/onboarding`, () => HttpResponse.json(state.current)),
    http.post(`${BASE}/onboarding/acceptances`, async ({ request }) => {
      sent = (await request.json()) as typeof sent;
      state.current = onboarding({
        required_texts: [{ key: "terms", title: "Terms of Service", version: "1.0", accepted: true }],
      });
      return HttpResponse.json(
        { id: "a1", document_key: "terms", version: "1.0", source: "settings", document_id: "d1", created_at: "2026-09-13T12:00:00Z" },
        { status: 201 },
      );
    }),
  );

  renderWithProvider(<DataPrivacyPanel />);

  const terms = (await screen.findByText("Terms of Service")).closest("li, .bg-list__item, div") as HTMLElement;
  expect(screen.getByText("Not drafted yet")).toBeInTheDocument();
  await userEvent.click(within(terms.parentElement as HTMLElement).getByRole("button", { name: "I have read and accept" }));

  expect(await screen.findByText("Accepted")).toBeInTheDocument();
  expect(sent).toEqual({ key: "terms", source: "settings" });
});
