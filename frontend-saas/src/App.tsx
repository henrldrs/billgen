import { BillGenProvider, LoadingScreen } from "@billgen/ui";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { SessionProvider, useSession } from "./auth/session";
import { api } from "./lib/api";
import { AppShell } from "./pages/AppShell";
import { LoginPage } from "./pages/LoginPage";
import {
  ClientsRoute,
  DashboardRoute,
  HistoryRoute,
  InvoiceBuilderRoute,
  ProductsRoute,
  SettingsRoute,
} from "./pages/routes";
import { SignupPage } from "./pages/SignupPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === "loading") return <LoadingScreen />;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BillGenProvider client={api}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardRoute />} />
              <Route path="clients" element={<ClientsRoute />} />
              <Route path="products" element={<ProductsRoute />} />
              <Route path="invoices/new" element={<InvoiceBuilderRoute />} />
              <Route path="invoices" element={<HistoryRoute />} />
              {/* Import & Activity moved into settings (nav decision 2026-07-10);
                  old URLs keep working via redirects. */}
              <Route
                path="activity"
                element={<Navigate to="/app/settings?section=activity" replace />}
              />
              <Route
                path="import"
                element={<Navigate to="/app/settings?section=import" replace />}
              />
              <Route path="settings" element={<SettingsRoute />} />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </BillGenProvider>
  );
}
