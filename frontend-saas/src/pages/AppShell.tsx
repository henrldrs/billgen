/** Authenticated shell: sidebar nav, company selector, first-run onboarding.
 *  Panels receive the selected companyId via router outlet context. */

import {
  CompanyForm,
  Spinner,
  t,
  useCompanies,
  type CompanyResponse,
  type Lang,
} from "@billgen/ui";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useSession } from "../auth/session";

export interface ShellContext {
  companyId: string;
  lang: Lang;
}

function isLang(value: string): value is Lang {
  return ["en", "fr", "nl", "es"].includes(value);
}

export function AppShell() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { data: companies, isLoading } = useCompanies();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) return <Spinner label="Loading…" />;

  // First run: no company yet -> onboarding. useCreateCompany invalidates the
  // companies query, so the shell re-renders into the app automatically.
  if (!companies || companies.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <h1 className="text-xl font-bold mb-4">Welcome to BillGen 👋</h1>
          <p className="text-sm text-gray-600 mb-4">
            Set up the company you invoice from. You can add more later.
          </p>
          <CompanyForm />
        </div>
      </main>
    );
  }

  const company: CompanyResponse =
    companies.find((c) => c.id === selectedId) ?? companies[0];
  const lang: Lang = isLang(company.default_language)
    ? company.default_language
    : "en";

  const links = [
    { to: "/app", label: t(lang, "dashboard.title"), end: true },
    { to: "/app/clients", label: t(lang, "clients.title") },
    { to: "/app/products", label: t(lang, "products.title") },
    { to: "/app/invoices/new", label: t(lang, "invoice.title") },
    { to: "/app/invoices", label: t(lang, "history.title") },
    { to: "/app/activity", label: t(lang, "activity.title") },
    { to: "/app/settings", label: t(lang, "company.title") },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 font-bold text-lg border-b border-gray-200">
          BillGen
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${
                  isActive
                    ? "bg-blue-50 text-blue-800 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-200 text-sm">
          <div className="font-medium truncate">{user?.displayName}</div>
          <div className="text-gray-500 truncate">{user?.email}</div>
          <button
            type="button"
            className="mt-2 text-blue-700 underline"
            onClick={() => {
              void logout().then(() => navigate("/login"));
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="font-semibold">{company.name}</div>
          {companies.length > 1 ? (
            <select
              aria-label="Company"
              className="bg-field__input max-w-56"
              value={company.id}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet context={{ companyId: company.id, lang } satisfies ShellContext} />
        </main>
      </div>
    </div>
  );
}
