/** Authenticated shell: TopNav carries the primary nav (the sidebar is gone),
 *  company switcher, account menu, Ctrl/⌘K command palette, first-run
 *  onboarding. Panels receive the selected companyId via router outlet context.
 *
 *  Nav is generated from the information architecture (scaffold/ia.ts): the
 *  sections flagged `primary` become the top-level links, everything else is
 *  reachable through those sections, the account menu or the ⌘K palette. The
 *  "+" CreateBillButton remains the one and only creation entry.
 *
 *  Links pointing at areas without a complete backend carry a ScaffoldNavDot —
 *  a small square marker, amber for partial and red for unwired — so the state
 *  of the product is legible from the nav bar itself. */

import {
  AccountMenu,
  AppShell as Shell,
  CommandPalette,
  CompanyForm,
  CompanyIcon,
  EntitlementBoundary,
  DashboardIcon,
  iaFor,
  LoadingScreen,
  OrgSwitcher,
  PlusIcon,
  PolicyIcon,
  ScaffoldNavDot,
  SettingsUserIcon,
  TopNav,
  UpgradeIcon,
  t,
  useCompanies,
  type BackendStatus,
  type CommandItem,
  type CompanyResponse,
  type IaSection,
  type Lang,
  type MenuEntry,
  type TopNavLink,
} from "@billgen/ui";
import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useSession } from "../auth/session";

export interface ShellContext {
  companyId: string;
  lang: Lang;
  /** The active company's default currency. The report endpoints return bare
   *  decimals, so every screen that renders money needs to be told this. */
  currency: string;
}

/** Palette-safe status marker (see the label comment in `commands`). */
const STATUS_SUFFIX: Record<BackendStatus, string> = {
  wired: "",
  partial: " · partial",
  none: " · no backend",
};

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
          <h1 className="bg-auth-page__brand">Welcome to BillGen</h1>
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

  // Icons are stand-ins until Henri draws the real set; the mapping lives here
  // rather than in ia.ts so the IA stays free of presentation concerns.
  const sectionIcon: Record<string, ReactNode> = {
    dashboard: <DashboardIcon />,
    sales: <PolicyIcon />,
    customers: <SettingsUserIcon />,
    catalog: <UpgradeIcon />,
    reports: <DashboardIcon />,
  };

  // Surface-scoped: desktop-only areas (offline sync, printing, auto-update)
  // must never appear in the web nav — the browser cannot render them.
  const saasIa: IaSection[] = iaFor("saas");
  const primary: IaSection[] = saasIa.filter((section) => section.primary);
  const toHref = (path: string | undefined) => `/app${path ? `/${path}` : ""}`;

  // Top bar carries the primary sections; each one opens a popup listing its
  // sub-pages (Henri's decision 2026-08-25, closing BGEN-BRAND-02 — top bar
  // with a popup list per sub-page, no sidebar). Dashboard has no sub-pages
  // worth a menu, so it stays a plain link.
  const links: TopNavLink[] = primary.map((section) => {
    const to = toHref(section.path);
    const label = (
      <>
        {section.key === "dashboard" ? t(lang, "dashboard.title") : section.label}
        <ScaffoldNavDot status={section.status} />
      </>
    );
    const active = section.path === "" ? pathname === "/app" : pathname.startsWith(to);
    const subPages = (section.children ?? []).filter((child) => child.path !== undefined);

    if (subPages.length === 0) {
      return { key: section.key, label, icon: sectionIcon[section.key], active, onClick: () => navigate(to) };
    }

    return {
      key: section.key,
      label,
      icon: sectionIcon[section.key],
      active,
      items: [
        // The section's own landing page: the trigger opens the menu rather
        // than navigating, so without this the overview is unreachable.
        {
          key: `${section.key}:overview`,
          label: `${section.label} overview`,
          onSelect: () => navigate(to),
        },
        ...subPages.map((child) => ({
          key: child.key,
          label: child.label,
          // The same marker the nav uses, so an unfinished destination is
          // legible before you click it rather than after.
          hint: <ScaffoldNavDot status={child.status} />,
          onSelect: () => navigate(toHref(child.path)),
        })),
      ],
    };
  });

  // The palette indexes the WHOLE architecture, not just the five primary
  // sections — it is the only way to reach Billing, Legal, Help and the rest
  // in one hop, and it doubles as a map of what still has no backend.
  const commands: CommandItem[] = [
    {
      key: "new-invoice",
      label: t(lang, "invoice.title"),
      icon: <PlusIcon />,
      section: "Create",
      keywords: "new invoice bill create facture",
      onRun: () => {
        setPaletteOpen(false);
        navigate("/app/sales/invoices/new");
      },
    },
    ...saasIa.flatMap((section) =>
      [section, ...(section.children ?? [])]
        .filter((node) => node.path !== undefined)
        .map((node) => ({
          key: `${section.key}:${node.key}`,
          // CommandPalette interpolates label into its substring filter, so this
          // stays a plain string — the status rides along as searchable text
          // ("partial", "no backend") rather than as a marker node.
          label: `${node.label}${STATUS_SUFFIX[node.status]}`,
          icon: sectionIcon[section.key],
          section: section === node ? "Go to" : section.label,
          keywords: `${section.label} ${node.label} ${node.path ?? ""} ${node.status}`,
          onRun: () => {
            setPaletteOpen(false);
            navigate(toHref(node.path));
          },
        })),
    ),
  ];

  // Sections that are not in the primary bar hang off the account menu.
  const secondary = saasIa.filter((section) => !section.primary);

  const accountItems: MenuEntry[] = [
    ...secondary.map((section) => ({
      key: section.key,
      label: section.label,
      icon: section.key === "company" ? <CompanyIcon /> : undefined,
      onSelect: () => navigate(toHref(section.path)),
    })),
    { type: "separator" as const, key: "sep" },
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
          onCreateBill={() => navigate("/app/sales/invoices/new")}
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
            onCreateNew={() => navigate("/app/company/profile")}
          />
        </TopNav>
      }
    >
      <Outlet
        context={
          {
            companyId: company.id,
            lang,
            currency: company.default_currency,
          } satisfies ShellContext
        }
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
      {/* Every commercial refusal in the app, handled once. It listens to the
          React Query caches, so no panel, hook or button opts in and none of
          them contains payment logic — which is what the uniform 402 body was
          for. It lives here rather than around <BillGenProvider> because the
          upgrade prompt needs the router to reach the plan screen. */}
      <EntitlementBoundary lang={lang} onSeePlans={() => navigate("/app/billing/plan")} />
    </Shell>
  );
}
