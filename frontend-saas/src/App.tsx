import { BillGenProvider, LoadingScreen } from "@billgen/ui";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { SessionProvider, useSession } from "./auth/session";
import { api } from "./lib/api";
import { AppShell } from "./pages/AppShell";
import { LoginPage } from "./pages/LoginPage";
import {
  ClientDetailRoute,
  InvoiceBuilderRoute,
  InvoiceDetailRoute,
  buildAppRoutes,
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
              {/* Every IA node with a path, generated — see pages/routes.tsx. */}
              {buildAppRoutes()}

              {/* Actions and detail views: not destinations in the IA tree. */}
              <Route path="sales/invoices/new" element={<InvoiceBuilderRoute />} />
              <Route path="sales/invoices/id/:invoiceId" element={<InvoiceDetailRoute />} />
              <Route path="customers/clients/:clientId" element={<ClientDetailRoute />} />

              {/* Pre-IA URLs keep working. */}
              <Route path="invoices/new" element={<Navigate to="/app/sales/invoices/new" replace />} />
              <Route path="invoices" element={<Navigate to="/app/sales/invoices" replace />} />
              <Route path="clients" element={<Navigate to="/app/customers/clients" replace />} />
              <Route path="products" element={<Navigate to="/app/catalog/products" replace />} />
              <Route path="import" element={<Navigate to="/app/settings/import" replace />} />
              <Route path="activity" element={<Navigate to="/app/activity/audit" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </BillGenProvider>
  );
}
