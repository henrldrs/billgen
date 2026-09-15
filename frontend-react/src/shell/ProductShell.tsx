/** The shell, for both surfaces. TopNav carries the primary nav (the sidebar
 *  is gone), company switcher, account menu, Ctrl/⌘K command palette, first-run
 *  onboarding. Panels receive the selected companyId via router outlet context.
 *
 *  **There is one of these on purpose (T-19).** `frontend-electron` used to
 *  carry a second implementation — a tab state machine over eleven panels, no
 *  router, no IA — and it lagged this file the moment either changed. What
 *  actually differs between a browser tab and a Tauri window turned out to be
 *  two things, and they are the whole `PlatformAdapter`: which IA surface to
 *  render, and whether there is a session to sign out of. Everything else —
 *  the router, the language provider, the palette, the theme — is the same
 *  code reached through the same hooks.
 *
 *  Nav is generated from the information architecture (scaffold/ia.ts): the
 *  sections flagged `primary` become the top-level links, everything else is
 *  reachable through those sections, the account menu or the ⌘K palette. The
 *  "+" CreateBillButton remains the one and only creation entry.
 *
 *  Under `exposure="all"` links pointing at areas without a complete backend
 *  carry a ScaffoldNavDot — a small square marker, amber for partial and red
 *  for unwired — so the state of the product is legible from the nav bar
 *  itself. Under `exposure="wired"` there is nothing to mark: everything
 *  offered works, and the marker would only cast doubt on it. */

import { useTheme } from "../lib/theme";
import { markTourDone, tourPending } from "../lib/tour";
import { tourLabels, tourSteps } from "./tourSteps";

import {
  AccountMenu,
  AppShell as Shell,
  CommandPalette,
  CompanyForm,
  CompanyIcon,
  EntitlementBoundary,
  DashboardIcon,
  GuidedTour,
  HelpIcon,
  iaFor,
  isNavDestination,
  routableNodes,
  LoadingScreen,
  OrgSwitcher,
  PlusIcon,
  PolicyIcon,
  ScaffoldNavDot,
  SettingsUserIcon,
  LanguageToggle,
  ThemeSwitcher,
  TopNav,
  UpgradeIcon,
  alertsOffered,
  t,
  useAlerts,
  useCompanies,
  useLang,
  useSearch,
  type BackendStatus,
  type CommandItem,
  type CompanyResponse,
  type IaSection,
  type SearchHitResponse,
  type Exposure,
  type Lang,
  type Surface,
  type MenuEntry,
  type TopNavLink,
} from "../internal";
import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

/** What a surface has to tell the shell, and nothing more.
 *
 *  Deliberately *not* here: the token store, the base URL and theme
 *  persistence. Those are bootstrap concerns — `lib/api.ts` and `main.tsx` own
 *  them, on both surfaces, and threading them through the shell would have
 *  made the shell the place platform differences accumulate again. */
export interface PlatformAdapter {
  /** Which IA to render. The web nav must never offer the desktop-only areas
   *  (offline sync, printing, auto-update) — a browser cannot render them —
   *  and the desktop should see them. `iaFor` and `routableNodes` both take
   *  this, so the nav, the palette and the router agree by construction. */
  surface: Surface;
  /** How much of the product this build offers. `"all"` shows the whole IA,
   *  scaffold pages included, which is what development wants. `"wired"` shows
   *  only what a server fully answers, which is what anybody who was handed a
   *  build wants — see `Exposure` in `scaffold/ia.ts` for why that is not the
   *  same question as which surface this is. */
  exposure?: Exposure;
  /** The signed-in human, when there is one. The desktop is a single local
   *  session with nowhere to log out *to*, so it supplies a name and no
   *  `onLogout`, and the menu simply has no such entry. The menu itself stays:
   *  it is how the secondary sections are reached on either surface. */
  account?: {
    name?: string;
    email?: string;
    onLogout?: () => void;
  };
}

export interface ShellContext {
  companyId: string;
  lang: Lang;
  /** Passed down because a screen can embed a scaffold of its own — the
   *  dashboard's alerts block does — and the IA prune cannot see inside a
   *  component. A screen that shows a placeholder has to ask. */
  exposure: Exposure;
  /** The active company's default currency. The report endpoints return bare
   *  decimals, so every screen that renders money needs to be told this. */
  currency: string;
}

/** Where a search hit goes when it is picked, and whether that is the record.
 *
 *  Two of the five kinds have a record screen drawn — invoices and clients.
 *  The other three have only the section that lists them. That asymmetry is
 *  left visible rather than papered over: inventing a quote, credit-note or
 *  product detail screen is inventing a screen, which is not this change's
 *  business. So those hits land on their section and the hint says so, instead
 *  of navigating somewhere that looks like a record and is not.
 *
 *  A kind the server grows later and this map has not is dropped rather than
 *  guessed at — see the flatMap below. */
const HIT_DESTINATION: Record<
  string,
  { iaPath: string; href: (id: string) => string; section: string; record: boolean }
> = {
  invoice: {
    iaPath: "sales/invoices/id/:invoiceId",
    href: (id) => `/app/sales/invoices/id/${id}`,
    section: "Invoices",
    record: true,
  },
  client: {
    iaPath: "customers/clients/:clientId",
    href: (id) => `/app/customers/clients/${id}`,
    section: "Clients",
    record: true,
  },
  quote: {
    iaPath: "sales/quotes",
    href: () => "/app/sales/quotes",
    section: "Quotes",
    record: false,
  },
  credit_note: {
    iaPath: "sales/credit-notes",
    href: () => "/app/sales/credit-notes",
    section: "Credit notes",
    record: false,
  },
  product: {
    iaPath: "catalog/products",
    href: () => "/app/catalog/products",
    section: "Products",
    record: false,
  },
};

/** Palette-safe status marker (see the label comment in `commands`). */
const STATUS_SUFFIX: Record<BackendStatus, string> = {
  wired: "",
  partial: " · partial",
  none: " · no backend",
};

function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = (name?.trim() || email || "?").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function ProductShell({ surface, exposure = "all", account }: PlatformAdapter) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: companies, isLoading } = useCompanies();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // What is typed in the palette. The palette still owns its own query and
  // its own filtering; this is a copy, so the server can be asked too.
  const [paletteQuery, setPaletteQuery] = useState("");
  const [theme, setTheme] = useTheme();

  // The guided tour. Opens by itself once, when the first run has just been
  // finished and the person has left the wizard (`lib/tour.ts`), and from
  // the account menu whenever they want it again. It walks the dashboard,
  // so opening it goes there first.
  const [tourOpen, setTourOpen] = useState(false);
  const startTour = () => {
    navigate("/app");
    setTourOpen(true);
  };
  useEffect(() => {
    if (tourOpen || pathname.startsWith("/app/onboarding") || !tourPending()) return;
    setTourOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check on navigation only
  }, [pathname]);
  const closeTour = () => {
    markTourDone();
    setTourOpen(false);
  };

  // Records, from the server. The palette used to navigate to pages and nothing
  // else, so typing an invoice number off a bank statement answered "nothing
  // matches" while the invoice sat in the database. `useSearch` debounces and
  // stays disabled under two characters, so an empty or barely started query
  // costs no request.
  //
  // Gated on `paletteOpen` rather than on the query alone: the palette clears
  // its field when it opens, not when it closes, so a closed palette would
  // otherwise leave the last term live — nothing renders it, but React Query
  // would still hold it warm and refetch it on a window focus.
  //
  // Above the early returns, for the reason already written out further down
  // beside `activeCompanyLanguage` — this file has made that mistake once.
  const { data: searchResults } = useSearch(paletteOpen ? paletteQuery : "", 5);

  // The bell. Its dot is the server's alert count for the active company,
  // and clicking it lands on the dashboard's alerts card — the bell is a
  // pointer to the card, not a second list. Same §MVP switch as the card.
  const { data: alertsData } = useAlerts(
    alertsOffered(exposure) && selectedId ? selectedId : undefined,
  );
  const alertCount =
    (alertsData?.counts_by_severity.critical ?? 0) + (alertsData?.counts_by_severity.warning ?? 0);
  const goToAlerts = () => {
    navigate("/app");
    requestAnimationFrame(() => {
      const card = document.getElementById("bg-alerts");
      if (card && typeof card.scrollIntoView === "function") card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
  //  The language is not decided here and no longer reported up either:
  //  `LanguageProvider` reconciles the person's own choice with the operating
  //  system's language, and the company's *document* language stopped being
  //  part of that chain on 2026-09-10 — see its docstring.

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
  // must never appear in the web nav — the browser cannot render them — and
  // must appear in the desktop one. One call, two answers.
  const ia: IaSection[] = iaFor(surface, exposure);
  //  What this build actually mounted. Used to keep the palette from offering
  //  a record whose screen is not part of this surface.
  const routablePaths = new Set(
    routableNodes(surface, exposure).map((node) => node.path),
  );
  //  Nothing to warn about when everything offered works.
  const marker = (status: BackendStatus) =>
    exposure === "all" ? <ScaffoldNavDot status={status} /> : null;
  const primary: IaSection[] = ia.filter((section) => section.primary);
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
        {marker(section.status)}
      </>
    );
    const active = section.path === "" ? pathname === "/app" : pathname.startsWith(to);
    // Not every routable child is a destination. A node curated out of the nav
    // (ROADMAP_IA §11b) keeps its path, its status and its place in the
    // coverage count — it just stops being a door, because a door is for
    // somewhere you go BEFORE you know which record you want. The palette
    // below still indexes all of them.
    const subPages = (section.children ?? []).filter(isNavDestination);

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
          hint: marker(child.status),
          onSelect: () => navigate(toHref(child.path)),
        })),
      ],
    };
  });

  const recordCommands: CommandItem[] = (searchResults?.hits ?? []).flatMap(
    (hit: SearchHitResponse) => {
      const destination = HIT_DESTINATION[hit.kind];
      // A kind this shell does not know where to send is not shown. Guessing a
      // route would navigate somewhere wrong; showing an inert row would be
      // worse than the "nothing matches" this whole change exists to remove.
      //
      // The same argument covers a kind this *build* does not mount: the
      // server still finds a credit note on a surface that offers no credit
      // notes, and offering to open one would navigate into nothing. The
      // routable set is the same one the router was built from, so the two
      // cannot drift.
      if (!destination || !routablePaths.has(destination.iaPath)) return [];

      return [
        {
          key: `hit:${hit.kind}:${hit.id}`,
          label: hit.title,
          section: destination.section,
          hint: destination.record ? (hit.subtitle ?? undefined) : "opens the list",
          // CommandPalette filters `commands` by substring over label,
          // keywords and section — and a server hit legitimately need not
          // contain the term at all: searching a VAT number returns a client
          // whose label is their name. Carrying the query itself in keywords is
          // what keeps those hits from being filtered back out on arrival.
          keywords: `${paletteQuery} ${hit.subtitle ?? ""} ${hit.status ?? ""}`,
          onRun: () => {
            setPaletteOpen(false);
            navigate(destination.href(hit.id));
          },
        },
      ];
    },
  );

  // The palette indexes the WHOLE architecture, not just the five primary
  // sections — it is the only way to reach Billing, Legal, Help and the rest
  // in one hop, and it doubles as a map of what still has no backend.
  const commands: CommandItem[] = [
    // Records first: if a query matched real data, that is the answer, and
    // the architecture entries below are the fallback rather than the point.
    ...recordCommands,
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
    ...ia.flatMap((section) =>
      [section, ...(section.children ?? [])]
        // Deliberately NOT isNavDestination: a node curated out of the nav is
        // exactly what the palette is for — it is the escape hatch that makes
        // curating safe. A path with a route parameter is a different matter:
        // there is no client id to fill `:clientId` with here, so the entry
        // would navigate to that literal string.
        .filter((node) => node.path !== undefined && !node.path.includes(":"))
        .map((node) => ({
          key: `${section.key}:${node.key}`,
          // CommandPalette interpolates label into its substring filter, so this
          // stays a plain string — the status rides along as searchable text
          // ("partial", "no backend") rather than as a marker node.
          label: `${node.label}${exposure === "all" ? STATUS_SUFFIX[node.status] : ""}`,
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
  const secondary = ia.filter((section) => !section.primary);

  const accountItems: MenuEntry[] = [
    ...secondary.map((section) => ({
      key: section.key,
      label: section.label,
      icon: section.key === "company" ? <CompanyIcon /> : undefined,
      onSelect: () => navigate(toHref(section.path)),
    })),
    { type: "separator" as const, key: "sep-help" },
    // The tour lives here because this is where its last stop points: the
    // menu that reaches settings, the plan and help.
    {
      key: "tour",
      label: t(lang, "tour.menu"),
      icon: <HelpIcon />,
      onSelect: startTour,
    },
    // No entry where there is nothing to sign out to. The web ends a real
    // session; the desktop returns to its sign-in screen; a surface that
    // supplies neither gets no such entry.
    ...(account?.onLogout
      ? [
          { type: "separator" as const, key: "sep" },
          {
            key: "logout",
            label: t(lang, "account.signOut"),
            danger: true,
            onSelect: account.onLogout,
          },
        ]
      : []),
  ];

  return (
    <Shell
      width="wide"
      nav={
        <TopNav
          variant="floating"
          title={company.name}
          links={links}
          onNavigateHome={() => navigate("/app")}
          onCreateBill={() => navigate("/app/sales/invoices/new")}
          onSearchClick={() => setPaletteOpen(true)}
          notificationCount={alertCount}
          onNotificationsClick={goToAlerts}
          accountSlot={
            <AccountMenu
              name={account?.name ?? "Account"}
              email={account?.email}
              initials={initialsOf(account?.name, account?.email)}
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
          {/* Beside the company switcher rather than inside the account menu:
              changing language is what you do when the interface is in one you
              cannot read, and a menu you must read to find is no use then. */}
          <LanguageToggle ariaLabel={t(lang, "settings.language")} />
          {/* Beside the language toggle for the same reason it is: both are
              "the interface is wrong for me right now" controls, and both are
              useless buried in a menu that is itself hard to read — a person
              on a dark screen at night should not have to open anything. It
              stays in Settings too; this is the shortcut, not the home. */}
          <ThemeSwitcher theme={theme} onChange={setTheme} size="sm" />
        </TopNav>
      }
    >
      <Outlet
        context={
          {
            companyId: company.id,
            lang,
            exposure,
            currency: company.default_currency,
          } satisfies ShellContext
        }
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        onQueryChange={setPaletteQuery}
      />
      {/* Every commercial refusal in the app, handled once. It listens to the
          React Query caches, so no panel, hook or button opts in and none of
          them contains payment logic — which is what the uniform 402 body was
          for. It lives here rather than around <BillGenProvider> because the
          upgrade prompt needs the router to reach the plan screen. */}
      <EntitlementBoundary lang={lang} onSeePlans={() => navigate("/app/billing/plan")} />
      <GuidedTour open={tourOpen} steps={tourSteps(lang)} labels={tourLabels(lang)} onClose={closeTour} />
    </Shell>
  );
}
