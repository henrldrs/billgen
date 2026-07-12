/** Thin route components: read the shell context, mount the corresponding
 *  @billgen/ui panel. */

import {
  ActivityPanel,
  BackIcon,
  BackupPanel,
  ClientsPanel,
  CompanyForm,
  CompanyIcon,
  DashboardPanel,
  ForwardIcon,
  HistoryPanel,
  ImportPanel,
  InvoiceBuilderPanel,
  PolicyIcon,
  ProductsPanel,
  SearchIcon,
  SettingsShell,
  ThemeSwitcher,
  t,
  useCompanies,
} from "@billgen/ui";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";

import { useTheme } from "../lib/theme";
import type { ShellContext } from "./AppShell";

export function DashboardRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <DashboardPanel companyId={companyId} lang={lang} />;
}

export function ClientsRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <ClientsPanel companyId={companyId} lang={lang} />;
}

export function ProductsRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <ProductsPanel companyId={companyId} lang={lang} />;
}

export function InvoiceBuilderRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  return (
    <InvoiceBuilderPanel
      companyId={companyId}
      lang={lang}
      onCreated={() => navigate("/app/invoices")}
    />
  );
}

export function HistoryRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <HistoryPanel companyId={companyId} lang={lang} />;
}

/** Company details hosts Import data + Activity log (settings-level pages per
 *  Henri's nav decision), plus theme preferences. The active section rides in
 *  ?section= so /app/import and /app/activity can redirect here losslessly.
 *  ForwardIcon/SearchIcon in the rail are stand-ins pending Henri's sketches. */
export function SettingsRoute() {
  const { lang } = useOutletContext<ShellContext>();
  const { data: companies } = useCompanies();
  const [searchParams, setSearchParams] = useSearchParams();
  const [theme, setTheme] = useTheme();

  const sections = [
    { key: "company", label: t(lang, "company.title"), icon: <CompanyIcon /> },
    { key: "import", label: t(lang, "import.title"), icon: <ForwardIcon /> },
    { key: "backup", label: t(lang, "backup.title"), icon: <BackIcon /> },
    { key: "activity", label: t(lang, "activity.title"), icon: <SearchIcon /> },
    { key: "preferences", label: "Preferences", icon: <PolicyIcon /> },
  ];
  const active = sections.some((s) => s.key === searchParams.get("section"))
    ? (searchParams.get("section") as string)
    : "company";

  return (
    <SettingsShell
      sections={sections}
      activeKey={active}
      onSectionChange={(key) =>
        setSearchParams(key === "company" ? {} : { section: key })
      }
    >
      {active === "company" ? (
        <div>
          {companies && companies.length > 0 ? (
            <section className="bg-panel">
              <h1 className="text-lg font-semibold mb-3">Companies</h1>
              <ul className="list-disc pl-5 text-sm">
                {companies.map((company) => (
                  <li key={company.id}>
                    {company.name}
                    {company.vat_number ? ` — ${company.vat_number}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <CompanyForm lang={lang} />
        </div>
      ) : active === "import" ? (
        <ImportPanel lang={lang} />
      ) : active === "backup" ? (
        <BackupPanel lang={lang} />
      ) : active === "activity" ? (
        <ActivityPanel lang={lang} />
      ) : (
        <section className="bg-panel">
          <h1 className="text-lg font-semibold mb-3">Preferences</h1>
          <div className="bg-field">
            <span className="bg-field__label">Theme</span>
            <ThemeSwitcher theme={theme} onChange={setTheme} />
          </div>
        </section>
      )}
    </SettingsShell>
  );
}
