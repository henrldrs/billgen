/** Desktop navigation shell: tab state (no router needed), first-run onboarding,
 *  panels from @billgen/ui. Single local user, so no login/logout chrome. */

import {
  ActivityPanel,
  ClientsPanel,
  CompanyForm,
  DashboardPanel,
  HistoryPanel,
  InvoiceBuilderPanel,
  ProductsPanel,
  Spinner,
  t,
  useCompanies,
  type Lang,
} from "@billgen/ui";
import { useState } from "react";

type Tab =
  | "dashboard"
  | "clients"
  | "products"
  | "new-invoice"
  | "invoices"
  | "activity"
  | "settings";

function isLang(value: string): value is Lang {
  return ["en", "fr", "nl", "es"].includes(value);
}

export function DesktopShell() {
  const { data: companies, isLoading } = useCompanies();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (isLoading) return <Spinner label="Loading…" />;

  if (!companies || companies.length === 0) {
    return (
      <main style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1rem" }}>
        <h1 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Welcome to BillGen 👋
        </h1>
        <p style={{ color: "#4b5a6b", marginBottom: "1rem" }}>
          Set up the company you invoice from to get started.
        </p>
        <CompanyForm />
      </main>
    );
  }

  const company = companies[0];
  const lang: Lang = isLang(company.default_language) ? company.default_language : "en";
  const companyId = company.id;

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: t(lang, "dashboard.title") },
    { id: "clients", label: t(lang, "clients.title") },
    { id: "products", label: t(lang, "products.title") },
    { id: "new-invoice", label: t(lang, "invoice.title") },
    { id: "invoices", label: t(lang, "history.title") },
    { id: "activity", label: t(lang, "activity.title") },
    { id: "settings", label: t(lang, "company.title") },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          background: "#fff",
          borderRight: "1px solid #dfe5ec",
          padding: "1rem 0.5rem",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "1.1rem", padding: "0 0.75rem 1rem" }}>
          BillGen
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="bg-button bg-button--secondary"
              style={{
                textAlign: "left",
                border: "none",
                background: tab === item.id ? "#e8effc" : "transparent",
                color: tab === item.id ? "#1c46a5" : "#1b2430",
                fontWeight: tab === item.id ? 600 : 400,
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #dfe5ec",
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
          }}
        >
          {company.name}
        </header>
        <main style={{ padding: "1.5rem", overflow: "auto" }}>
          {tab === "dashboard" && <DashboardPanel companyId={companyId} lang={lang} />}
          {tab === "clients" && <ClientsPanel companyId={companyId} lang={lang} />}
          {tab === "products" && <ProductsPanel companyId={companyId} lang={lang} />}
          {tab === "new-invoice" && (
            <InvoiceBuilderPanel
              companyId={companyId}
              lang={lang}
              onCreated={() => setTab("invoices")}
            />
          )}
          {tab === "invoices" && <HistoryPanel companyId={companyId} lang={lang} />}
          {tab === "activity" && <ActivityPanel lang={lang} />}
          {tab === "settings" && <CompanyForm lang={lang} />}
        </main>
      </div>
    </div>
  );
}
