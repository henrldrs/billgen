import { BillGenProvider, LoadingScreen } from "@billgen/ui";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { SessionProvider, useSession } from "./auth/session";
import { api } from "./lib/api";
import { AppShell } from "./pages/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { PreviewRoute } from "./pages/PreviewRoute";
import {
  InvoiceBuilderRoute,
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

            {/* Dev-only preview of the un-integrated scaffolds in
                @billgen/ui/src/{workspace,tva}. Owns no IA node, appears in no
                nav, and is absent from a production build. Delete this line and
                pages/PreviewRoute.tsx to remove it. */}
            {import.meta.env.DEV && <Route path="/_preview" element={<PreviewRoute />} />}
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

              {/* The invoice builder is an action, not a destination, so it owns
                  no IA node and must be declared here. The two DETAIL views used
                  to be declared here too and never rendered: buildAppRoutes()
                  emits their paths from the IA, and the first route declared for
                  a path wins. They now live in routes.tsx's BUILT map. */}
              <Route path="sales/invoices/new" element={<InvoiceBuilderRoute />} />

              {/* Pre-IA URLs keep working. None of these may collide with a
                  path the IA owns, or the generated route wins and the redirect
                  silently never fires — enforced by scaffold/routes.test.ts. */}
              <Route path="invoices/new" element={<Navigate to="/app/sales/invoices/new" replace />} />
              <Route path="invoices" element={<Navigate to="/app/sales/invoices" replace />} />
              <Route path="clients" element={<Navigate to="/app/customers/clients" replace />} />
              <Route path="products" element={<Navigate to="/app/catalog/products" replace />} />
              <Route path="import" element={<Navigate to="/app/settings/import" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </BillGenProvider>
  );
}
