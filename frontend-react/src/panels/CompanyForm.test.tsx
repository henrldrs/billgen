import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, companyRecord, renderWithProvider } from "../test/utils";
import { CompanyForm } from "./CompanyForm";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("submits the company and fires onCreated", async () => {
  server.use(
    http.post(`${BASE}/companies`, async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        invoice_reference_prefix: string;
        default_language: string;
      };
      expect(body).toMatchObject({
        name: "Acme Consulting",
        invoice_reference_prefix: "ACME-",
        default_language: "fr",
      });
      return HttpResponse.json(
        companyRecord({ name: body.name, invoice_reference_prefix: "ACME-" }),
        { status: 201 },
      );
    }),
  );

  const onCreated = vi.fn();
  renderWithProvider(<CompanyForm onCreated={onCreated} />);
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("Company name"), "Acme Consulting");
  await user.type(screen.getByLabelText("Invoice prefix"), "ACME-");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await vi.waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  expect(onCreated.mock.calls[0][0].name).toBe("Acme Consulting");
});
