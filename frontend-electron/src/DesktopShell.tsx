/** Desktop navigation shell: tab state (no router needed), first-run onboarding,
 *  panels from @billgen/ui. Single local user, so no login/logout chrome.
 *
 *  Same TopNav-only nav as the SaaS shell (nav decision 2026-07-10): Dashboard ·
 *  Clients · Products & services · Invoices · Company details. The "+" button is
 *  the sole creation entry; Import data and Activity log live inside Company
 *  details. OrgSwitcher closes the old companies[0]-only gap. */

import {
  ActivityPanel,
  AppShell as Shell,
  BackIcon,
  BackupPanel,
  ClientsPanel,
  CommandPalette,
  CompanyForm,
  CompanySettingsPanel,
  CompanyIcon,
  DashboardIcon,
  DashboardPanel,
  EntitlementBoundary,
  ForwardIcon,
  HistoryPanel,
  ImportPanel,
  InvoiceBuilderPanel,
  LoadingScreen,
  OrgSwitcher,
  PlansPanel,
  PlusIcon,
  PolicyIcon,
  ProductsPanel,
  SearchIcon,
  SettingsShell,
  SettingsUserIcon,
  ThemeSwitcher,
  TopNav,
  UpgradeIcon,
  UsagePanel,
  t,
  useCompanies,
  type CommandItem,
  type Lang,
  type TopNavLink,
} from "@billgen/ui";
import { useEffect, useState } from "react";

import { useTheme } from "./lib/theme";

type Tab =
  | "dashboard"
  | "clients"
  | "products"
  | "new-invoice"
  | "invoices"
  | "settings";

type SettingsSection =
  | "company"
  | "plan"
  | "import"
  | "backup"
  | "activity"
  | "preferences";

function isLang(value: string): value is Lang {
  return ["en", "fr", "nl", "es"].includes(value);
}

export function DesktopShell() {
  const { data: companies, isLoading } = useCompanies();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("company");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useTheme();

  // Pin the active company once the list loads (same rationale as the SaaS
  // shell: a refetch after an import must not yank the user onto another
  // company mid-task).
  useEffect(() => {
    if (selectedId == null && companies && companies.length > 0) {
      setSelectedId(companies[0].id);
    }
  }, [companies, selectedId]);

  // Ctrl/⌘K toggles the command palette.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (isLoading) return <LoadingScreen />;

  if (!companies || companies.length === 0) {
    return (
      <Shell>
        <div style={{ maxWidth: 560, margin: "2.5rem auto 0" }}>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
            Welcome to BillGen
          </h1>
          <p style={{ marginBottom: "1rem" }}>
            Set up the company you invoice from to get started.
          </p>
          <CompanyForm />
        </div>
      </Shell>
    );
  }

  const company = companies.find((c) => c.id === selectedId) ?? companies[0];
  const lang: Lang = isLang(company.default_language) ? company.default_language : "en";
  const companyId = company.id;

  // UpgradeIcon on Products & services is a stand-in until Henri draws the
  // real icon (same as the SaaS shell).
  const navItems: { key: Tab; label: string; icon: TopNavLink["icon"] }[] = [
    { key: "dashboard", label: t(lang, "dashboard.title"), icon: <DashboardIcon /> },
    { key: "clients", label: t(lang, "clients.title"), icon: <SettingsUserIcon /> },
    { key: "products", label: t(lang, "products.title"), icon: <UpgradeIcon /> },
    { key: "invoices", label: t(lang, "history.title"), icon: <PolicyIcon /> },
    { key: "settings", label: t(lang, "company.title"), icon: <CompanyIcon /> },
  ];

  const links: TopNavLink[] = navItems.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    // The invoice builder is reached from "+", not the nav; keep Invoices lit
    // while building one (mirrors the SaaS shell's /app/invoices/new).
    active:
      item.key === "invoices" ? tab === "invoices" || tab === "new-invoice" : tab === item.key,
    onClick: () => setTab(item.key),
  }));

  const commands: CommandItem[] = [
    {
      key: "new-invoice",
      label: t(lang, "invoice.title"),
      icon: <PlusIcon />,
      section: "Create",
      keywords: "new invoice bill create",
      onRun: () => {
        setPaletteOpen(false);
        setTab("new-invoice");
      },
    },
    ...navItems.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      section: "Go to",
      onRun: () => {
        setPaletteOpen(false);
        setTab(item.key);
      },
    })),
  ];

  // ForwardIcon/SearchIcon are stand-ins pending Henri's sketches.
  const settingsSections = [
    { key: "company", label: t(lang, "company.title"), icon: <CompanyIcon /> },
    // Desktop is a single local user, but the plan is the ORGANISATION's and
    // the same server refuses the same calls with the same 402 — so the
    // allowances have to be visible here too, not only in the web app.
    { key: "plan", label: t(lang, "plan.title"), icon: <UpgradeIcon /> },
    { key: "import", label: t(lang, "import.title"), icon: <ForwardIcon /> },
    { key: "backup", label: t(lang, "backup.title"), icon: <BackIcon /> },
    { key: "activity", label: t(lang, "activity.title"), icon: <SearchIcon /> },
    { key: "preferences", label: "Preferences", icon: <PolicyIcon /> },
  ];

  return (
    <Shell
      width="wide"
      nav={
        <TopNav
          variant="floating"
          title={company.name}
          links={links}
          onNavigateHome={() => setTab("dashboard")}
          onCreateBill={() => setTab("new-invoice")}
          onSearchClick={() => setPaletteOpen(true)}
        >
          <OrgSwitcher
            orgs={companies.map((c) => ({
              key: c.id,
              name: c.name,
              detail: c.vat_number ?? undefined,
            }))}
            activeKey={company.id}
            onChange={setSelectedId}
            onCreateNew={() => {
              setSettingsSection("company");
              setTab("settings");
            }}
          />
          {/* In the bar, not only in Preferences: a person on a dark screen at
              night should not have to open a menu to fix it. It stays in
              Preferences too — this is the shortcut, not the home. */}
          <ThemeSwitcher theme={theme} onChange={setTheme} size="sm" />
        </TopNav>
      }
    >
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
      {tab === "settings" && (
        <SettingsShell
          sections={settingsSections}
          activeKey={settingsSection}
          onSectionChange={(key) => setSettingsSection(key as SettingsSection)}
        >
          {settingsSection === "company" ? (
            <div className="bg-stack">
              {/* The whole record, one screen: the desktop settings rail has no
                  room for the six sections the SaaS IA splits it into. */}
              <CompanySettingsPanel companyId={companyId} lang={lang} />
              {companies.length > 1 ? (
                <section className="bg-panel">
                  <h1 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Companies
                  </h1>
                  <ul style={{ paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                    {companies.map((c) => (
                      <li key={c.id}>
                        {c.name}
                        {c.vat_number ? ` — ${c.vat_number}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <CompanyForm lang={lang} />
            </div>
          ) : settingsSection === "plan" ? (
            <div className="bg-stack">
              <UsagePanel lang={lang} />
              <PlansPanel lang={lang} />
            </div>
          ) : settingsSection === "import" ? (
            <ImportPanel lang={lang} />
          ) : settingsSection === "backup" ? (
            <BackupPanel lang={lang} />
          ) : settingsSection === "activity" ? (
            <ActivityPanel lang={lang} />
          ) : (
            <section className="bg-panel">
              <h1 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                Preferences
              </h1>
              <div className="bg-field">
                <span className="bg-field__label">Theme</span>
                <ThemeSwitcher theme={theme} onChange={setTheme} />
              </div>
            </section>
          )}
        </SettingsShell>
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
      {/* One listener for every commercial refusal — see the SaaS shell. There
          is no router here, so "See plans" moves the settings rail instead. */}
      <EntitlementBoundary
        lang={lang}
        onSeePlans={() => {
          setSettingsSection("plan");
          setTab("settings");
        }}
      />
    </Shell>
  );
}
