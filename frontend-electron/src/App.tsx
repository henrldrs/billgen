import {
  ApiClient,
  BillGenProvider,
  ErrorState,
  type Exposure,
  FirstRunGate,
  InvoiceBuilderRoute,
  LanguageProvider,
  LoadingScreen,
  buildAppRoutes,
} from "@billgen/ui";
import type { LoginResponse } from "@billgen/ui";
import { useEffect, useState } from "react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

import { DesktopShell } from "./DesktopShell";
import { createApi } from "./lib/api";

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

type BootState =
  | { status: "connecting" }
  | { status: "ready"; api: ApiClient; session: LoginResponse }
  | { status: "error"; message: string };

export function App() {
  const [boot, setBoot] = useState<BootState>({ status: "connecting" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = await createApi();
        const session = await api.desktopBootstrap(); // local single-user session
        if (!cancelled) setBoot({ status: "ready", api, session });
      } catch (error) {
        if (!cancelled) {
          setBoot({
            status: "error",
            message: error instanceof Error ? error.message : "Startup failed",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (boot.status === "connecting") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <LoadingScreen label="Starting BillGen…" />
      </div>
    );
  }

  if (boot.status === "error") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <ErrorState
          title="Could not start BillGen"
          description={`${boot.message} — the local service did not respond. Try relaunching the app.`}
        />
      </div>
    );
  }

  return (
    <BillGenProvider client={boot.api}>
      {/* Same provider the web app uses, so the language toggle in the bar
          works here too and the choice is written back to the local user. */}
      <LanguageProvider
        onPersist={(lang) => {
          void boot.api.updateMe({ language: lang }).catch(() => {});
        }}
      >
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
                    displayName={boot.session.display_name}
                    email={boot.session.email}
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
      </LanguageProvider>
    </BillGenProvider>
  );
}
