import {
  ApiClient,
  BillGenProvider,
  ErrorState,
  InvoiceBuilderRoute,
  LanguageProvider,
  LoadingScreen,
  buildAppRoutes,
  type Exposure,
} from "@billgen/ui";
import type { LoginResponse } from "@billgen/ui";
import { useEffect, useState } from "react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

import { DesktopShell } from "./DesktopShell";
import { createApi } from "./lib/api";

/** A packaged build offers only what a server fully answers; a dev build shows
 *  the whole IA so the state of the product stays legible while working on it.
 *
 *  `VITE_BILLGEN_EXPOSURE=wired` forces the shipped behaviour under `vite dev`,
 *  which is the only way to actually look at what a beta tester will see. */
const EXPOSURE: Exposure =
  import.meta.env.VITE_BILLGEN_EXPOSURE === "wired" || !import.meta.env.DEV
    ? "wired"
    : "all";

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
                <DesktopShell
                  exposure={EXPOSURE}
                  displayName={boot.session.display_name}
                  email={boot.session.email}
                />
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
