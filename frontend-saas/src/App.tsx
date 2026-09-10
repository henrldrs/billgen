import {
  BillGenProvider,
  InvoiceBuilderRoute,
  LanguageProvider,
  LoadingScreen,
  ProductShell,
  buildAppRoutes,
} from "@billgen/ui";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { SessionProvider, useSession } from "./auth/session";
import { api } from "./lib/api";
import { LoginPage } from "./pages/LoginPage";
import { PreviewRoute } from "./pages/PreviewRoute";
import { SignupPage } from "./pages/SignupPage";

/** Wraps the app in the interface language, and persists a change.
 *
 *  Above the router because the language applies to the login screen too — a
 *  provider under `RequireAuth` would leave sign-in stuck in one language for
 *  the people least able to change it.
 */
function WithLanguage({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return (
    <LanguageProvider
      userLanguage={user?.language}
      onPersist={(lang) => {
        //  Fire-and-forget: the choice already applies locally, and a failed
        //  write should not undo it or interrupt the person. It retries
        //  implicitly the next time they change it.
        void api.updateMe({ language: lang }).catch(() => {});
      }}
    >
      {children}
    </LanguageProvider>
  );
}

/** The web's PlatformAdapter: the SaaS IA, and a real session to end.
 *
 *  A component rather than an object literal because both halves are hooks —
 *  the session and the navigate that follows a logout. */
function WebShell() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  return (
    <ProductShell
      surface="saas"
      account={{
        name: user?.displayName,
        email: user?.email,
        onLogout: () => {
          void logout().then(() => navigate("/login"));
        },
      }}
    />
  );
}

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
        <WithLanguage>
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
                  <WebShell />
                </RequireAuth>
              }
            >
              {/* Every IA node with a path, generated — @billgen/ui shell/routes. */}
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
        </WithLanguage>
      </SessionProvider>
    </BillGenProvider>
  );
}
