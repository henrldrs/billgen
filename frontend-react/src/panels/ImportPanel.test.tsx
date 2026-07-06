import { screen, waitFor } from "@testing-library/react";
// backup state readiness is signalled by the Preview button becoming enabled.
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BASE, renderWithProvider } from "../test/utils";
import { ImportPanel } from "./ImportPanel";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const PREVIEW = {
  dry_run: true,
  companies: { created: 1, skipped: 0, failed: 0 },
  clients: { created: 2, skipped: 0, failed: 0 },
  products: { created: 3, skipped: 1, failed: 0 },
  invoices_detected: 4,
  issues: [],
};

function backupFile() {
  const body = { app: "FinanceFlow BillGen", keys: { "billgen-companies": "[]" } };
  return new File([JSON.stringify(body)], "backup.json", { type: "application/json" });
}

async function upload() {
  const user = userEvent.setup();
  const { container } = renderWithProvider(<ImportPanel />);
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, backupFile());
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Preview import" })).toBeEnabled(),
  );
  return user;
}

test("preview is a dry run that writes nothing, then commit confirms", async () => {
  let committed = false;
  server.use(
    http.post(`${BASE}/imports/legacy/preview`, () => HttpResponse.json(PREVIEW)),
    http.post(`${BASE}/imports/legacy/commit`, () => {
      committed = true;
      return HttpResponse.json({ ...PREVIEW, dry_run: false });
    }),
  );

  const user = await upload();

  await user.click(screen.getByRole("button", { name: "Preview import" }));
  expect(await screen.findByText(/nothing has been saved/i)).toBeInTheDocument();
  expect(committed).toBe(false);
  // 4 invoices detected -> the "not imported" note shows.
  expect(screen.getByText(/invoice\(s\) were found/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Confirm import" }));
  expect(await screen.findByText(/Import complete/i)).toBeInTheDocument();
  expect(committed).toBe(true);
});

test("surfaces a 409 from an invalid backup", async () => {
  server.use(
    http.post(`${BASE}/imports/legacy/preview`, () =>
      HttpResponse.json({ detail: "Unrecognized backup app 'Nope'" }, { status: 409 }),
    ),
  );

  const user = await upload();
  await user.click(screen.getByRole("button", { name: "Preview import" }));
  expect(await screen.findByText(/Unrecognized backup app/i)).toBeInTheDocument();
});

test("rejects a file that is not valid JSON", async () => {
  const user = userEvent.setup();
  const { container } = renderWithProvider(<ImportPanel />);
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;

  await user.upload(input, new File(["not json"], "bad.json", { type: "application/json" }));

  expect(await screen.findByText(/not valid JSON/i)).toBeInTheDocument();
  // Preview stays disabled with no valid backup loaded.
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Preview import" })).toBeDisabled(),
  );
});
