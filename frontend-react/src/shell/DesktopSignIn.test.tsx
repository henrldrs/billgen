/** The desktop's sign-in screen, in its three states. The boot machine is
 *  the Tauri shell's and is not here; this asserts what each state shows and
 *  which callback each control reaches. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { LanguageProvider } from "../providers/LanguageProvider";
import { DesktopSignIn, type DesktopSignInProps } from "./DesktopSignIn";

const ACCOUNT = {
  name: "Emilia Rossi",
  email: "emilia@example.be",
  organization: "Rossi Consulting",
  plan: "partner",
  dataDirectory: "C:\\Users\\emilia\\Documents\\BillGen",
};

function mount(overrides: Partial<DesktopSignInProps> = {}) {
  const props: DesktopSignInProps = {
    state: { status: "ready", account: ACCOUNT },
    onContinue: vi.fn(),
    onRetry: vi.fn(),
    autoOpen: false,
    onAutoOpenChange: vi.fn(),
    ...overrides,
  };
  render(
    <LanguageProvider>
      <DesktopSignIn {...props} />
    </LanguageProvider>,
  );
  return props;
}

test("ready: names the account, the business, the plan and the folder, and continues", async () => {
  const props = mount();

  expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  expect(screen.getByText("Emilia Rossi")).toBeInTheDocument();
  expect(screen.getByText("Rossi Consulting")).toBeInTheDocument();
  expect(screen.getByText("emilia@example.be")).toBeInTheDocument();
  expect(screen.getByText(/Documents\\BillGen/)).toBeInTheDocument();
  //  The plan is the wire value translated, never the raw tier name.
  expect(screen.queryByText("partner")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Open BillGen" }));
  expect(props.onContinue).toHaveBeenCalledOnce();

  await userEvent.click(screen.getByRole("switch", { name: "Open automatically next time" }));
  expect(props.onAutoOpenChange).toHaveBeenCalledWith(true);
});

test("after a sign-out the lead says so", () => {
  mount({ state: { status: "ready", account: ACCOUNT, signedOut: true } });
  expect(screen.getByText(/You signed out/)).toBeInTheDocument();
});

test("connecting shows the startup state and no button", () => {
  mount({ state: { status: "connecting" } });
  expect(screen.getByText("Starting the local service…")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open BillGen" })).not.toBeInTheDocument();
});

test("error names the failure and retries", async () => {
  const props = mount({ state: { status: "error", message: "sidecar did not report a port" } });
  expect(screen.getByText("BillGen could not start")).toBeInTheDocument();
  expect(screen.getByText("sidecar did not report a port")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(props.onRetry).toHaveBeenCalledOnce();
});

test("the language can be changed from the screen itself", async () => {
  mount();
  await userEvent.click(screen.getByRole("button", { name: /^Language/ }));
  await userEvent.click(screen.getByRole("menuitemradio", { name: /Français/ }));
  expect(screen.getByRole("heading", { name: "Bon retour" })).toBeInTheDocument();
});
