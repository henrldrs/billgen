import {
  ApiClient,
  BillGenProvider,
  DesktopSignIn,
  type DesktopAccount,
  type DesktopSignInState,
  type Exposure,
  FirstRunGate,
  InvoiceBuilderRoute,
  LanguageProvider,
  buildAppRoutes,
} from "@billgen/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

import { DesktopShell } from "./DesktopShell";
import { createApi, tokenStore } from "./lib/api";

/** A packaged build offers the first release surface; a dev build shows the
 *  whole IA so the state of the product stays legible while working on it.
 *
 *  `"mvp"` rather than `"wired"`: wired asks whether a server answers a screen,
 *  §MVP asks whether the screen is part of the first release, and they
 *  disagree in both directions — credit notes and the reports are wired and
 *  out of scope; the invoice and client record screens are `partial` (email
 *  delivery is missing) and indispensable. `MVP_SURFACE` in `scaffold/ia.ts`
 *  is the list.
 *
 *  `VITE_BILLGEN_EXPOSURE` forces a value under `vite dev`, which is the only
 *  way to look at what a beta tester will actually see. */
const EXPOSURE: Exposure =
  (import.meta.env.VITE_BILLGEN_EXPOSURE as Exposure | undefined) ??
  (import.meta.env.DEV ? "all" : "mvp");

/** Whether later launches skip the sign-in screen. Per machine, like the
 *  theme: it describes this window, not the account. */
const AUTO_OPEN_KEY = "billgen.desktop.autoOpen";

function storedAutoOpen(): boolean {
  try {
    return localStorage.getItem(AUTO_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** The window's four states, in the order they happen.
 *
 *  `connecting` — the Rust shell is spawning the sidecar and this side is
 *  asking it for the port, then minting the local session.
 *  `ready` — signed in, showing who; waiting for "Open BillGen" unless the
 *  person asked to skip that.
 *  `in` — the product.
 *  `error` — the sidecar never answered. The screen offers a retry rather
 *  than a relaunch, because the retry is the same call. */
type BootState =
  | { status: "connecting" }
  | { status: "ready"; api: ApiClient; account: DesktopAccount; signedOut?: boolean }
  | { status: "in"; api: ApiClient; account: DesktopAccount }
  | { status: "error"; message: string };

export function App() {
  const [boot, setBoot] = useState<BootState>({ status: "connecting" });
  const [autoOpen, setAutoOpen] = useState(storedAutoOpen);
  const apiRef = useRef<ApiClient | null>(null);

  const connect = useCallback(async (options: { signedOut?: boolean } = {}) => {
    setBoot({ status: "connecting" });
    try {
      const api = apiRef.current ?? (await createApi());
      apiRef.current = api;
      const session = await api.desktopBootstrap(); // local single-user session
      // Two more reads for the sign-in card. Neither may block the app:
      // a name and a plan are worth showing, not worth refusing to start over.
      const [organization, onboarding] = await Promise.all([
        api.currentOrganization().catch(() => null),
        api.onboardingStatus().catch(() => null),
      ]);
      const account: DesktopAccount = {
        name: session.display_name,
        email: session.email,
        organization: organization?.name ?? null,
        plan: organization?.plan_tier ?? null,
        dataDirectory: onboarding?.data_directory ?? null,
      };
      // Auto-open is for launches, not for a sign-out the person just asked
      // for: that one always shows the screen it returned to.
      if (autoOpen && !options.signedOut) setBoot({ status: "in", api, account });
      else setBoot({ status: "ready", api, account, signedOut: options.signedOut });
    } catch (error) {
      setBoot({
        status: "error",
        message: error instanceof Error ? error.message : "Startup failed",
      });
    }
  }, [autoOpen]);

  useEffect(() => {
    void connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, []);

  const changeAutoOpen = (next: boolean) => {
    setAutoOpen(next);
    try {
      localStorage.setItem(AUTO_OPEN_KEY, next ? "1" : "0");
    } catch {
      /* private mode */
    }
  };

  const signOut = () => {
    // The session is in memory only; dropping it and re-minting on the next
    // "Open BillGen" is the whole sign-out. Nothing on disk changes.
    tokenStore.clear();
    void connect({ signedOut: true });
  };

  const signInState: DesktopSignInState =
    boot.status === "connecting"
      ? { status: "connecting" }
      : boot.status === "error"
        ? { status: "error", message: boot.message }
        : { status: "ready", account: boot.account, signedOut: boot.status === "ready" && boot.signedOut };

  return (
    // The language provider sits above the sign-in screen for the same
    // reason it sits above the web's login page: a person who cannot read
    // the screen has to be able to change what it is written in. Persisting
    // the choice needs a session, so the callback checks for one.
    <LanguageProvider
      onPersist={(lang) => {
        void apiRef.current?.updateMe({ language: lang }).catch(() => {});
      }}
    >
      {boot.status !== "in" ? (
        <DesktopSignIn
          state={signInState}
          onContinue={() => {
            if (boot.status === "ready") setBoot({ status: "in", api: boot.api, account: boot.account });
          }}
          onRetry={() => void connect()}
          autoOpen={autoOpen}
          onAutoOpenChange={changeAutoOpen}
        />
      ) : (
        <BillGenProvider client={boot.api}>
          {/* MemoryRouter, not BrowserRouter: a Tauri window has no address bar
              to reflect and no server to ask for a deep path on reload. The
              routes themselves are the shared ones, generated from the IA with
              the desktop surface — which is how this window gets the template
              studio and the report screens the old tab shell never had. */}
          <MemoryRouter initialEntries={["/app"]}>
            <Routes>
              <Route
                path="/app"
                element={
                  <FirstRunGate>
                    <DesktopShell
                      exposure={EXPOSURE}
                      displayName={boot.account.name}
                      email={boot.account.email}
                      onSignOut={signOut}
                    />
                  </FirstRunGate>
                }
              >
                {buildAppRoutes("desktop", EXPOSURE)}
                {/* An action, not a destination, so it owns no IA node — exactly
                    as in the web app. */}
                <Route path="sales/invoices/new" element={<InvoiceBuilderRoute />} />
              </Route>
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </MemoryRouter>
        </BillGenProvider>
      )}
    </LanguageProvider>
  );
}
