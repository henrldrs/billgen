import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, COMPANY_ID, companyRecord, renderWithProvider } from "../test/utils";
import { CompanySettingsPanel } from "./CompanySettingsPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function company(extra: Parameters<typeof companyRecord>[0] = {}) {
  return http.get(`${BASE}/companies/${COMPANY_ID}`, () =>
    HttpResponse.json(companyRecord(extra)),
  );
}

function validation(extra: Record<string, unknown> = {}) {
  return http.get(`${BASE}/companies/${COMPANY_ID}/validation`, () =>
    HttpResponse.json({
      company_id: COMPANY_ID,
      valid: true,
      peppol_ready: true,
      checks: [{ field: "country_code", value: "BE", valid: true, normalized: "BE" }],
      missing_for_peppol: [],
      ...extra,
    }),
  );
}

const templates = http.get(`${BASE}/pdf-templates`, () =>
  HttpResponse.json({
    templates: [
      { id: "fr_standard", lang: "fr", doc_title: "Facture" },
      { id: "nl_minimal", lang: "nl", doc_title: "Factuur" },
    ],
    default_template: "fr_standard",
  }),
);

test("renders the stored record into the form", async () => {
  server.use(company({ vat_number: "BE0123456749", city: "Gent" }), validation(), templates);

  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} />);

  expect(await screen.findByDisplayValue("Acme Consulting")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Gent")).toBeInTheDocument();
  expect(screen.getByDisplayValue("BE0123456749")).toBeInTheDocument();
});

test("sends only the fields that changed", async () => {
  const bodies: unknown[] = [];
  server.use(
    company({ city: "Gent" }),
    validation(),
    templates,
    http.patch(`${BASE}/companies/${COMPANY_ID}`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(companyRecord({ city: "Brugge" }));
    }),
  );

  const user = userEvent.setup();
  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="profile" />);

  const city = await screen.findByDisplayValue("Gent");
  await user.clear(city);
  await user.type(city, "Brugge");
  await user.click(screen.getByRole("button", { name: "Save" }));

  // The record has ten other fields; a PATCH carrying them would be this form
  // overwriting values it merely displayed.
  await waitFor(() => expect(bodies).toEqual([{ city: "Brugge" }]));
});

test("an emptied nullable field is sent as null, not as an empty string", async () => {
  const bodies: unknown[] = [];
  server.use(
    company({ phone: "+32 2 555 00 00" }),
    validation(),
    templates,
    http.patch(`${BASE}/companies/${COMPANY_ID}`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(companyRecord());
    }),
  );

  const user = userEvent.setup();
  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="profile" />);

  await user.clear(await screen.findByDisplayValue("+32 2 555 00 00"));
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(bodies).toEqual([{ phone: null }]));
});

test("saving nothing sends nothing", async () => {
  server.use(company(), validation(), templates);

  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="bank" />);

  // No PATCH handler is registered: an unexpected request fails the run.
  expect(await screen.findByText("Everything saved")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("an invalid identifier is reported on its own field", async () => {
  server.use(
    company({ iban: "BE00 0000 0000 0000" }),
    validation({
      valid: false,
      peppol_ready: false,
      checks: [
        {
          field: "iban",
          value: "BE00 0000 0000 0000",
          valid: false,
          normalized: null,
          message_key: "errSupplierIban",
        },
      ],
      missing_for_peppol: [],
    }),
    templates,
  );

  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="bank" />);

  expect(await screen.findByText("Your company IBAN is missing or invalid.")).toBeInTheDocument();
  expect(screen.getByDisplayValue("BE00 0000 0000 0000")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("editing a field drops its verdict rather than reusing it", async () => {
  server.use(
    company({ iban: "BE00 0000 0000 0000" }),
    validation({
      valid: false,
      peppol_ready: false,
      checks: [
        {
          field: "iban",
          value: "BE00 0000 0000 0000",
          valid: false,
          normalized: null,
          message_key: "errSupplierIban",
        },
      ],
      missing_for_peppol: [],
    }),
    templates,
  );

  const user = userEvent.setup();
  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="bank" />);

  const iban = await screen.findByDisplayValue("BE00 0000 0000 0000");
  await user.type(iban, "1");

  // The verdict describes the stored value, which is no longer what is typed.
  expect(screen.queryByText("Your company IBAN is missing or invalid.")).not.toBeInTheDocument();
  expect(screen.getByText("Checked again when you save.")).toBeInTheDocument();
});

test("what still blocks Peppol is named, with the supplier-side caveat", async () => {
  server.use(
    company(),
    validation({
      valid: true,
      peppol_ready: false,
      checks: [],
      missing_for_peppol: ["vat_number", "iban"],
    }),
    templates,
  );

  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="vat" />);

  expect(await screen.findByText("Not ready to send via Peppol")).toBeInTheDocument();
  expect(screen.getByText(/VAT number, IBAN/)).toBeInTheDocument();
  // Never let this read as a promise that an e-invoice will be delivered.
  expect(screen.getByText(/client's are incomplete/)).toBeInTheDocument();
});

test("the template picker offers what the server can render", async () => {
  server.use(company(), validation(), templates);

  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="defaults" />);

  expect(await screen.findByRole("option", { name: "Facture · FR" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Factuur · NL" })).toBeInTheDocument();
});

test("discarding restores the stored values", async () => {
  server.use(company({ city: "Gent" }), validation(), templates);

  const user = userEvent.setup();
  renderWithProvider(<CompanySettingsPanel companyId={COMPANY_ID} section="profile" />);

  const city = await screen.findByDisplayValue("Gent");
  await user.clear(city);
  await user.type(city, "Brugge");
  expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Discard changes" }));

  expect(screen.getByDisplayValue("Gent")).toBeInTheDocument();
});
