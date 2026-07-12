/** Authenticated shell: TopNav carries the primary nav (the sidebar is gone),
 *  company switcher, account menu, Ctrl/⌘K command palette, first-run
 *  onboarding. Panels receive the selected companyId via router outlet context.
 *
 *  Nav structure per Henri's decision (2026-07-10): Dashboard · Clients ·
 *  Products & services · Invoices · Company details — nothing else. The "+"
 *  CreateBillButton is the one and only creation entry; Import data and
 *  Activity log live inside Company details (see SettingsRoute). */

import {
  AccountMenu,
  AppShell as Shell,
  CommandPalette,
  CompanyForm,
  CompanyIcon,
  DashboardIcon,
  LoadingScreen,
  OrgSwitcher,
  PlusIcon,
  PolicyIcon,
  SettingsUserIcon,
  TopNav,
  UpgradeIcon,
  t,
  useCompanies,
  type CommandItem,
  type CompanyResponse,
  type Lang,
  type MenuEntry,
  type TopNavLink,
} from "@billgen/ui";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useSession } from "../auth/session";

export interface ShellContext {
  companyId: string;
  lang: Lang;
}

function isLang(value: string): value is Lang {
  return ["en", "fr", "nl", "es"].includes(value);
}

function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = (name?.trim() || email || "?").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function AppShell() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: companies, isLoading } = useCompanies();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Pin the active company once the list loads. Without this, refetches (e.g.
  // after an import adds a company) fall back to companies[0] and yank the user
  // onto a different company mid-task.
  useEffect(() => {
    if (selectedId == null && companies && companies.length > 0) {
      setSelectedId(companies[0].id);
    }
  }, [companies, selectedId]);

  // Ctrl/⌘K toggles the command palette (CommandPalette is controlled).
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

  // First run: no company yet -> onboarding. useCreateCompany invalidates the
  // companies query, so the shell re-renders into the app automatically.
  if (!companies || companies.length === 0) {
    return (
      <Shell>
        <div className="max-w-lg mx-auto pt-10">
          <h1 className="text-xl font-bold mb-4">Welcome to BillGen 👋</h1>
          <p className="text-sm mb-4">
            Set up the company you invoice from. You can add more later.
          </p>
          <CompanyForm />
        </div>
      </Shell>
    );
  }

  const company: CompanyResponse =
    companies.find((c) => c.id === selectedId) ?? companies[0];
  const lang: Lang = isLang(company.default_language)
    ? company.default_language
    : "en";

  // UpgradeIcon on Products & services is a stand-in until Henri draws the
  // real icon (same for the settings-rail icons in SettingsRoute).
  const navItems = [
    { key: "dashboard", to: "/app", end: true, label: t(lang, "dashboard.title"), icon: <DashboardIcon /> },
    { key: "clients", to: "/app/clients", end: false, label: t(lang, "clients.title"), icon: <SettingsUserIcon /> },
    { key: "products", to: "/app/products", end: false, label: t(lang, "products.title"), icon: <UpgradeIcon /> },
    { key: "invoices", to: "/app/invoices", end: false, label: t(lang, "history.title"), icon: <PolicyIcon /> },
    { key: "settings", to: "/app/settings", end: false, label: t(lang, "company.title"), icon: <CompanyIcon /> },
  ];

  const links: TopNavLink[] = navItems.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    active: item.end ? pathname === item.to : pathname.startsWith(item.to),
    onClick: () => navigate(item.to),
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
        navigate("/app/invoices/new");
      },
    },
    ...navItems.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      section: "Go to",
      onRun: () => {
        setPaletteOpen(false);
        navigate(item.to);
      },
    })),
  ];

  const accountItems: MenuEntry[] = [
    {
      key: "settings",
      label: t(lang, "company.title"),
      icon: <CompanyIcon />,
      onSelect: () => navigate("/app/settings"),
    },
    { type: "separator", key: "sep" },
    {
      key: "logout",
      label: "Log out",
      danger: true,
      onSelect: () => {
        void logout().then(() => navigate("/login"));
      },
    },
  ];

  return (
    <Shell
      width="wide"
      nav={
        <TopNav
          title={company.name}
          links={links}
          onNavigateHome={() => navigate("/app")}
          onCreateBill={() => navigate("/app/invoices/new")}
          onSearchClick={() => setPaletteOpen(true)}
          accountSlot={
            <AccountMenu
              name={user?.displayName ?? "Account"}
              email={user?.email}
              initials={initialsOf(user?.displayName, user?.email)}
              items={accountItems}
            />
          }
        >
          <OrgSwitcher
            orgs={companies.map((c) => ({
              key: c.id,
              name: c.name,
              detail: c.vat_number ?? undefined,
            }))}
            activeKey={company.id}
            onChange={setSelectedId}
            onCreateNew={() => navigate("/app/settings?section=company")}
          />
        </TopNav>
      }
    >
      <Outlet context={{ companyId: company.id, lang } satisfies ShellContext} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </Shell>
  );
}
