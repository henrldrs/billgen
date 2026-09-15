/** Route tree — generated from the information architecture.
 *
 *  Every node in IA that owns a `path` gets a route here, automatically. A
 *  screen is only real if it is registered in BUILT below; everything else
 *  falls through to the scaffold kit, which states its own missing endpoints
 *  on the page. That inversion is the point: forgetting to build something
 *  produces a loud yellow page, never a 404 and never a silent omission.
 *
 *  To ship a feature: add its component to BUILT under the node's path, and
 *  flip the node's `status` in scaffold/ia.ts once the endpoints exist.
 */

import { ScaffoldExposureProvider } from "../scaffold/Scaffold";
import { OnboardingWizard } from "../panels/OnboardingWizard";
import {
  AccountPanel,
  ActivityPanel,
  AlertsPanel,
  AppearancePanel,
  BackupPanel,
  Badge,
  Breadcrumbs,
  Card,
  Client360Panel,
  ClientsPanel,
  CompanyForm,
  CompanySettingsPanel,
  CreditNotesPanel,
  DashboardPanel,
  DataPrivacyPanel,
  HistoryPanel,
  IA,
  ImportPanel,
  InvoiceBuilderPanel,
  InvoiceDetailPanel,
  InvoicesReportPanel,
  List,
  PageHeader,
  PaymentsReportPanel,
  PlansPanel,
  ProductsPanel,
  ReceivablesPanel,
  RevenueReportPanel,
  ScaffoldButton,
  ScaffoldField,
  ScaffoldHeading,
  ScaffoldMeter,
  ScaffoldNote,
  ScaffoldPage,
  ScaffoldTable,
  SettingsShell,
  Tabs,
  UsagePanel,
  VatReportPanel,
  alertsOffered,
  coverage,
  hasMessage,
  iaTrail,
  isExposed,
  routableNodes,
  t,
  useCompanies,
  type IaNode,
  type Exposure,
  type Lang,
  type Surface,
} from "../internal";
import type { ReactNode } from "react";
import { Navigate, Route, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { DevTierSwitch } from "./DevTierSwitch";
import { TemplateStudioScreen } from "./TemplateStudioScreen";

import type { ShellContext } from "./ProductShell";

/** A settings node's label and description in the interface language.
 *
 *  The IA's labels are English and are the ledger's; the rail, the tiles and
 *  the page titles read these instead when a translation exists, and fall
 *  back to the ledger's word when it does not — an untranslated section is a
 *  section with an English name, never a blank. */
function settingsLabel(lang: Lang, node: IaNode): string {
  const key = `settings.label.${node.key.replace(/^settings\./, "")}`;
  return hasMessage(key) ? t(lang, key) : node.label;
}
function settingsDescription(lang: Lang, node: IaNode): string | undefined {
  const key = `settings.desc.${node.key.replace(/^settings\./, "")}`;
  return hasMessage(key) ? t(lang, key) : undefined;
}

// ---------------------------------------------------------------- screen glue

interface ScreenProps {
  node: IaNode;
  companyId: string;
  lang: Lang;
  /** The active company's default currency. Report endpoints return bare
   *  decimals, so the screen has to be told what they are denominated in. */
  currency: string;
  /** Whether this build shows placeholders at all — see `ShellContext`. */
  exposure: Exposure;
}

type Screen = (props: ScreenProps) => ReactNode;

/** Read the shell context and render either the built screen or its scaffold.
 *
 *  Two things wrap EVERY screen here rather than being each screen's problem:
 *
 *  1. Breadcrumbs. Without them the only way back out of a leaf is the top nav,
 *     which is a nav bar being used as a back button. The trail comes from the
 *     IA, so a screen cannot forget to have one and cannot get it wrong.
 *  2. The settings rail. It used to be rendered by the two settings screens
 *     that happened to be BUILT, so the other thirteen dropped it and became
 *     dead ends — you could enter a settings page and not leave it except via
 *     the top nav. A rail that vanishes on most of the section it belongs to is
 *     worse than no rail; now the section owns it, not the screen.
 */
function IaScreen({ node }: { node: IaNode }) {
  const { companyId, lang, currency, exposure } = useOutletContext<ShellContext>();
  const Built = BUILT[node.path as string];
  const sketch = SKETCHES[node.path as string];

  // A node curated out of the nav (ROADMAP_IA §11b) keeps its route: the nav
  // stopped offering `company/vat` as a door, but a link, a bookmark or a
  // browser's autocomplete can still ask for it, and a path that used to work
  // must not start 404-ing because a menu was tidied. It lands where the
  // content actually went. `replace` so Back leaves the section rather than
  // bouncing off the redirect.
  if (node.mergedInto !== undefined) {
    return <Navigate to={`/app/${node.mergedInto}`} replace />;
  }

  const body = Built ? (
    <Built
      node={node}
      companyId={companyId}
      lang={lang}
      currency={currency}
      exposure={exposure}
    />
  ) : (
    <ScaffoldPage node={node}>{sketch?.()}</ScaffoldPage>
  );

  return (
    <>
      <IaBreadcrumbs node={node} />
      {isSettingsChild(node) ? <SettingsFrame node={node}>{body}</SettingsFrame> : body}
    </>
  );
}

/** Trail from the section down to this screen, every ancestor clickable. */
function IaBreadcrumbs({ node }: { node: IaNode }) {
  const navigate = useNavigate();
  const { lang } = useOutletContext<ShellContext>();
  //  The settings section reads in the interface language everywhere else
  //  (rail, tiles, titles); its trail should not be the one place it does not.
  const trail = iaTrail(node.path as string).map((entry) =>
    entry.key === "settings"
      ? { ...entry, label: t(lang, "settings.title") }
      : entry.key.startsWith("settings.")
        ? { ...entry, label: settingsLabel(lang, entry) }
        : entry,
  );

  // A one-item trail is the dashboard: "Dashboard ›" and nothing else is noise.
  if (trail.length < 2) return null;

  // "Clients › Clients › Client 360" — a section and its list often share a
  // name, and repeating it reads as a rendering bug rather than a hierarchy.
  const items = trail.filter(
    (entry, index) => index === 0 || entry.label !== trail[index - 1].label,
  );

  return (
    <Breadcrumbs
      items={items.map((entry, index) => ({
        key: entry.key,
        label: entry.label,
        onClick:
          index === items.length - 1
            ? undefined
            : () => navigate(`/app${entry.path ? `/${entry.path}` : ""}`),
      }))}
    />
  );
}

function isSettingsChild(node: IaNode): boolean {
  return node.key.startsWith("settings.");
}

/** The settings rail, around whatever the child screen turned out to be —
 *  built screen or scaffold. Keeping it outside BUILT is the point: an unwired
 *  settings page must still be escapable. */
function SettingsFrame({ node, children }: { node: IaNode; children: ReactNode }) {
  const navigate = useNavigate();
  const { lang, exposure } = useOutletContext<ShellContext>();
  // The rail lists what this build offers. A dev build sees the whole
  // ledger; a handed-over build sees its doors and nothing greyed out.
  const sections = (findNode("settings")?.children ?? []).filter((section) =>
    isExposed(section, exposure),
  );
  return (
    <SettingsShell
      sections={sections.map((section) => ({
        key: section.key,
        label: settingsLabel(lang, section),
        description: settingsDescription(lang, section),
      }))}
      activeKey={node.key}
      onSectionChange={(key) => {
        const target = sections.find((section) => section.key === key);
        if (target?.path) navigate(`/app/${target.path}`);
      }}
    >
      {children}
    </SettingsShell>
  );
}

/** Every IA node that owns a route on this surface, as <Route> elements.
 *
 *  The surface argument is not decoration: `routableNodes` defaults to "saas"
 *  precisely because the web router is the one that must never over-mount, and
 *  the desktop shell passes "desktop" to pick up the areas that need Tauri and
 *  a local filesystem. Same list the nav and the palette are built from. */
/** A screen, told which build it is in. Scaffold blocks inside a wired screen
 *  read this to stay off a handed-over build (see ScaffoldExposureProvider). */
function screen(node: IaNode, exposure: Exposure) {
  return (
    <ScaffoldExposureProvider exposure={exposure}>
      <IaScreen node={node} />
    </ScaffoldExposureProvider>
  );
}

export function buildAppRoutes(surface: Surface = "saas", exposure: Exposure = "all") {
  return routableNodes(surface, exposure)
    .filter((node) => node.path !== undefined)
    .map((node) =>
      node.path === "" ? (
        <Route key={node.key} index element={screen(node, exposure)} />
      ) : (
        <Route key={node.key} path={node.path} element={screen(node, exposure)} />
      ),
    );
}

// ------------------------------------------------------------- real screens

/** Section landing page: what lives here, and what state each part is in.
 *  This screen needs no backend — it is navigation — so it is built for real,
 *  with the design system rather than the scaffold kit. */
function SectionIndex({ node, lang, exposure }: ScreenProps) {
  const navigate = useNavigate();
  const stats = coverage([node]);
  const children = node.children ?? [];
  const isSettings = node.key === "settings";

  // A handed-over build gets tiles, in the interface language, with no
  // coverage arithmetic: "2 of 4 areas fully wired" is a sentence for the
  // person building the product, not the person using it. The dev build
  // keeps the ledger view below, badges and all.
  if (exposure !== "all") {
    return (
      <>
        <PageHeader
          title={isSettings ? t(lang, "settings.title") : node.label}
          subtitle={isSettings ? t(lang, "settings.intro") : undefined}
        />
        <div className="bg-settings-grid">
          {children
            .filter((child) => child.path)
            .map((child) => (
              <button
                key={child.key}
                type="button"
                className="bg-settings-tile"
                onClick={() => navigate(`/app/${child.path}`)}
              >
                <span className="bg-settings-tile__label">
                  {isSettings ? settingsLabel(lang, child) : child.label}
                </span>
                {isSettings && settingsDescription(lang, child) ? (
                  <span className="bg-settings-tile__desc">{settingsDescription(lang, child)}</span>
                ) : null}
              </button>
            ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={node.label}
        subtitle={`${stats.wired} of ${stats.total} areas fully wired`}
      />
      <Card padded={false}>
        <List
          items={children.map((child) => ({
            key: child.key,
            primary: child.label,
            secondary: child.note ?? child.endpoints?.join(" · "),
            trailing:
              child.status === "wired" ? (
                <Badge tone="success">ready</Badge>
              ) : child.status === "partial" ? (
                <Badge tone="warn">partial</Badge>
              ) : (
                <Badge tone="danger">no backend</Badge>
              ),
            onClick: child.path ? () => navigate(`/app/${child.path}`) : undefined,
          }))}
        />
      </Card>
    </>
  );
}

/** Dashboard: the KPIs, the alerts card, the chart, the shortcuts, the last
 *  few events — all real. The alerts card is composed here rather than inside
 *  DashboardPanel because where an alert's action *goes* is routing, and
 *  because the §MVP switch (`alertsOffered`) is the build's to read, not the
 *  panel's. That is the reason `exposure` is in `ShellContext`. */
function DashboardScreen({ companyId, lang, currency, exposure }: ScreenProps) {
  const navigate = useNavigate();
  // "See everything" only where the audit log is a screen this build offers.
  const audit = findNode("activity.audit");
  const auditOffered = audit != null && isExposed(audit, exposure);
  return (
    <>
      <PageHeader title={t(lang, "dashboard.title")} />
      <DashboardPanel
        companyId={companyId}
        lang={lang}
        currency={currency}
        onNewInvoice={() => navigate("/app/sales/invoices/new")}
        onNewClient={() => navigate("/app/customers/clients")}
        onNewProduct={() => navigate("/app/catalog/products")}
        onBackup={() => navigate("/app/settings/backup")}
        onOpenActivity={auditOffered ? () => navigate("/app/activity/audit") : undefined}
        alerts={
          alertsOffered(exposure) ? (
            <AlertsPanel
              companyId={companyId}
              lang={lang}
              currency={currency}
              onOpen={(alert) => {
                if (alert.target_type === "invoice") navigate(`/app/sales/invoices/id/${alert.target_id}`);
                else if (alert.target_type === "client") navigate(`/app/customers/clients/${alert.target_id}`);
                else navigate("/app/company/profile");
              }}
            />
          ) : undefined
        }
      />
    </>
  );
}


/** Invoices with the status tabs from the IA. The tab IS the filter, so the
 *  panel's own dropdown is suppressed via the `status` prop. */
function InvoicesScreen({ node, companyId, lang }: ScreenProps) {
  const navigate = useNavigate();
  const invoicesNode = findNode("sales.invoices");
  const filters = invoicesNode?.children ?? [];
  // The parent node is the unfiltered list, so "All" is rendered from it rather
  // than from a child that would duplicate its path.
  const tabs = filters.filter((child) => child.status === "wired");
  const unwired = filters.filter((child) => child.status !== "wired");
  const status = STATUS_BY_PATH[node.path as string];

  return (
    <>
      <PageHeader
        title={t(lang, "history.title")}
        actions={
          <button className="bg-button bg-button--primary" onClick={() => navigate("/app/sales/invoices/new")}>
            {t(lang, "invoice.title")}
          </button>
        }
      />
      <Tabs
        items={[
          { key: "sales/invoices", label: t(lang, "history.all") },
          ...tabs.map((tab) => ({ key: tab.path as string, label: tab.label })),
          ...unwired.map((tab) => ({
            key: tab.path as string,
            label: tab.label,
            // Sent and Viewed have no InvoiceStatus behind them. Disabled here
            // rather than hidden, so the missing lifecycle stays visible.
            disabled: true,
          })),
        ]}
        activeKey={node.path as string}
        onChange={(key) => navigate(`/app/${key}`)}
      />
      <HistoryPanel
        key={status ?? "all"}
        companyId={companyId}
        lang={lang}
        status={status}
        onOpenInvoice={(invoiceId) => navigate(`/app/sales/invoices/id/${invoiceId}`)}
      />
    </>
  );
}

/** The company section, whole: the edit form over PATCH /companies/{id} (B3)
 *  with every field group open, the gaps that have no fields yet rendered as
 *  scaffold blocks inside it, and the create form kept underneath — the
 *  onboarding gate is the only other place a company can be created, and it
 *  only ever runs once, so dropping it here would leave a one-company-per-
 *  account product by accident. */
function CompanyScreen({ node, companyId, lang }: ScreenProps) {
  const { data: companies } = useCompanies();
  return (
    <>
      <CompanySettingsPanel
        companyId={companyId}
        section="all"
        lang={lang}
        title={node.label}
      />
      {companies && companies.length > 1 ? (
        <Card title="Companies">
          <List
            items={companies.map((company) => ({
              key: company.id,
              primary: company.name,
              secondary: company.vat_number ?? undefined,
            }))}
          />
        </Card>
      ) : null}
      <CompanyForm lang={lang} />
    </>
  );
}


// --------------------------------------------------------- the built registry

const STATUS_BY_PATH: Record<string, string | undefined> = {
  "sales/invoices": undefined,
  "sales/invoices/draft": "draft",
  "sales/invoices/issued": "issued",
  "sales/invoices/paid": "paid",
  "sales/invoices/partially_paid": "partially_paid",
  "sales/invoices/overdue": "overdue",
  "sales/invoices/voided": "voided",
};

/** Path → real screen. Anything absent here renders as scaffold. */
const BUILT: Record<string, Screen> = {
  // dashboard
  "": DashboardScreen,

  // section landings — navigation only, no backend needed
  sales: SectionIndex,
  customers: SectionIndex,
  catalog: SectionIndex,
  reports: SectionIndex,
  billing: SectionIndex,
  documents: SectionIndex,
  explore: SectionIndex,
  activity: SectionIndex,
  help: SectionIndex,
  legal: SectionIndex,
  onboarding: SectionIndex,
  desktop: SectionIndex,

  // catalog — the template studio. The IA node predates the backend by
  // weeks; GET /pdf-templates still lists the four fixed Jinja templates
  // and this is the editable layer above it.
  "catalog/templates": ({ companyId, lang }) => (
    <TemplateStudioScreen companyId={companyId} lang={lang} />
  ),

  // sales
  "sales/invoices": InvoicesScreen,
  "sales/invoices/draft": InvoicesScreen,
  "sales/invoices/issued": InvoicesScreen,
  "sales/invoices/paid": InvoicesScreen,
  "sales/invoices/partially_paid": InvoicesScreen,
  "sales/invoices/overdue": InvoicesScreen,
  "sales/invoices/voided": InvoicesScreen,

  // sales — credit notes: backend was complete long before this screen existed
  "sales/credit-notes": ({ node, companyId, lang }) => {
    const navigate = useNavigate();
    return (
      <>
        <PageHeader title={node.label} />
        <CreditNotesPanel
          companyId={companyId}
          lang={lang}
          onGoToInvoices={() => navigate("/app/sales/invoices")}
        />
      </>
    );
  },

  // customers — Client 360. Registered here rather than as an explicit <Route>
  // in App.tsx: buildAppRoutes() already emits this path from the IA, and two
  // routes with the same path resolve to the first declared, which is the
  // generated one. BUILT is the documented way to claim a node's screen.
  "customers/clients/:clientId": ({ lang }) => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    if (!clientId) return null;
    return (
      <Client360Panel
        clientId={clientId}
        lang={lang}
        onBack={() => navigate("/app/customers/clients")}
        onOpenInvoice={(invoiceId) => navigate(`/app/sales/invoices/id/${invoiceId}`)}
        onNewInvoice={() => navigate("/app/sales/invoices/new")}
      />
    );
  },

  // sales — invoice detail. Same shadowing rule as Client 360 above: this was
  // registered only in App.tsx, so its sketch never rendered and the node fell
  // through to the bare scaffold page. It is now the real record screen: every
  // endpoint that scaffold listed as "already usable" was in fact usable.
  "sales/invoices/id/:invoiceId": ({ lang, exposure }) => {
    const { invoiceId } = useParams();
    const navigate = useNavigate();
    if (!invoiceId) return null;
    return (
      <InvoiceDetailPanel
        invoiceId={invoiceId}
        lang={lang}
        //  The Delivery block explains that Send needs an endpoint nobody has
        //  written. That is a note to the developers, and it does not belong
        //  on a customer's invoice screen (Henri, 2026-09-10).
        showUnbuilt={exposure === "all"}
        onBack={() => navigate("/app/sales/invoices")}
        onOpenClient={(clientId) => navigate(`/app/customers/clients/${clientId}`)}
        onDeleted={() => navigate("/app/sales/invoices")}
        onDuplicated={(copyId) => navigate(`/app/sales/invoices/id/${copyId}`)}
      />
    );
  },

  // customers & catalog
  "customers/clients": ({ companyId, lang }) => {
    const navigate = useNavigate();
    return (
      <ClientsPanel
        companyId={companyId}
        lang={lang}
        onOpenClient={(clientId) => navigate(`/app/customers/clients/${clientId}`)}
      />
    );
  },
  "catalog/products": ({ companyId, lang }) => (
    <ProductsPanel companyId={companyId} lang={lang} />
  ),

  // catalog — Archived is the SAME screen with the status filter preset, not a
  // second list. GET /products?status makes that a server query; the filter
  // control stays visible, so the view is a starting point rather than a
  // separate place with its own idea of what a product is.
  "catalog/archived": ({ companyId, lang }) => (
    <ProductsPanel companyId={companyId} lang={lang} status="archived" />
  ),

  // customers — the audit trail for client RECORDS. Wired since /activity grew
  // target_type, and the only screen in this section that never got one.
  "customers/activity": ({ node, lang }) => (
    <ActivityPanel
      lang={lang}
      targetType="client"
      title={node.label}
      hint={t(lang, "activity.clientHint")}
    />
  ),

  // reports — the three the server can answer today. VAT, payments, clients and
  // products stay scaffolded: each names the endpoint it is waiting for.
  "reports/revenue": ({ node, companyId, lang }) => (
    <>
      <PageHeader title={node.label} />
      <RevenueReportPanel companyId={companyId} lang={lang} />
    </>
  ),
  "reports/outstanding": ({ node, companyId, lang }) => {
    const navigate = useNavigate();
    return (
      <>
        <PageHeader title={node.label} />
        <ReceivablesPanel
          companyId={companyId}
          mode="outstanding"
          lang={lang}
          onOpenInvoice={(invoiceId) => navigate(`/app/sales/invoices/id/${invoiceId}`)}
        />
      </>
    );
  },
  "reports/overdue": ({ node, companyId, lang }) => {
    const navigate = useNavigate();
    return (
      <>
        <PageHeader title={node.label} />
        <ReceivablesPanel
          companyId={companyId}
          mode="overdue"
          lang={lang}
          onOpenInvoice={(invoiceId) => navigate(`/app/sales/invoices/id/${invoiceId}`)}
        />
      </>
    );
  },

  // reports — invoices. The node carried "would have to be tallied in the
  // browser, which is why this stays scaffolded" long after /reports/invoices
  // shipped. Every figure on the screen is that endpoint's.
  "reports/invoices": ({ companyId, lang }) => (
    <InvoicesReportPanel companyId={companyId} lang={lang} />
  ),

  // reports — payments. The last report over an endpoint that already existed:
  // /payments takes company_id and a paid_on window, and nothing asked it for
  // more than one invoice at a time until now.
  "reports/payments": ({ companyId, lang }) => {
    const navigate = useNavigate();
    return (
      <PaymentsReportPanel
        companyId={companyId}
        lang={lang}
        onOpenInvoice={(invoiceId) => navigate(`/app/sales/invoices/id/${invoiceId}`)}
      />
    );
  },

  // billing — the entitlement layer's two screens. Everything else under
  // Billing waits on a payment provider; these two need none, because usage and
  // the plan matrix are already served (GET /entitlements, GET /plans).
  "billing/usage": ({ lang }) => {
    const navigate = useNavigate();
    return <UsagePanel lang={lang} onSeePlans={() => navigate("/app/billing/plan")} />;
  },
  "billing/plan": ({ lang }) => (
    <>
      {/* Dev-only, and it removes itself from a production build. Here rather
          than in a hidden corner because this is the screen a person is already
          on when they want to see what another tier looks like. */}
      <DevTierSwitch />
      <PlansPanel lang={lang} />
    </>
  ),

  // reports - VAT. The most valuable report in a Belgian invoicing product and
  // the last one without a screen; the endpoint has existed for months.
  // Unlike the other report screens, this panel owns its own PageHeader - the
  // period it is showing belongs in the subtitle, next to the title.
  "reports/vat": ({ companyId, lang }) => (
    <VatReportPanel companyId={companyId} lang={lang} />
  ),

  // company — NOT a SectionIndex, unlike every other section. Its nine nodes
  // are nine views of one row, so the section landing IS the record: one
  // CompanySettingsPanel with every section open, and the six sub-paths
  // redirect into it (ROADMAP_IA §11b, curated 2026-08-27). They were six
  // near-identical entries here until then, which is what six nav doors onto
  // one PATCH costs.
  company: CompanyScreen,
  settings: SectionIndex,
  //  The settings screens render only their own content; the rail around
  //  them is SettingsFrame's, which is what keeps it a property of the
  //  section rather than of the screens that happen to be built.
  "settings/account": ({ lang, node }) => <AccountPanel lang={lang} title={settingsLabel(lang, node)} />,
  "settings/appearance": ({ lang, node }) => (
    <AppearancePanel lang={lang} title={settingsLabel(lang, node)} />
  ),
  "settings/privacy": ({ lang, node }) => {
    const navigate = useNavigate();
    return (
      <DataPrivacyPanel
        lang={lang}
        title={settingsLabel(lang, node)}
        onOpenBackup={() => navigate("/app/settings/backup")}
      />
    );
  },
  "settings/import": ({ lang }) => <ImportPanel lang={lang} />,
  "settings/backup": ({ lang }) => <BackupPanel lang={lang} />,
  //  The first run (T-29). Reads the language itself; state is the server's.
  "onboarding/wizard": () => <OnboardingWizard />,
  "activity/audit": ({ lang }) => <ActivityPanel lang={lang} />,
};

// ------------------------------------------------------------------- sketches

/** Optional layout sketches for unwired screens, drawn with the scaffold kit
 *  so the intended shape is visible without pretending to be finished. */
const SKETCHES: Record<string, () => ReactNode> = {
  "sales/quotes": () => (
    <>
      <ScaffoldTable columns={["Number", "Client", "Date", "Valid until", "Total", "Status"]} />
      <ScaffoldButton wouldDo="create a quote">New quote</ScaffoldButton>
      <ScaffoldButton wouldDo="convert the quote into an invoice">Convert to invoice</ScaffoldButton>
    </>
  ),
  "sales/recurring": () => (
    <>
      <ScaffoldTable columns={["Client", "Every", "Next run", "Amount", "Active"]} />
      <ScaffoldButton wouldDo="schedule a recurring invoice">New schedule</ScaffoldButton>
    </>
  ),
  "sales/reminders": () => (
    <>
      <ScaffoldNote>
        Belgian practice is a three-step escalation: friendly reminder, formal
        notice, then a demand carrying statutory late interest. Each step needs
        its own template and a record of when it was sent.
      </ScaffoldNote>
      <ScaffoldTable columns={["Invoice", "Client", "Days overdue", "Last reminder", "Next step"]} />
      <ScaffoldButton wouldDo="send a reminder email">Send reminder</ScaffoldButton>
    </>
  ),
  "billing/payment-method": () => (
    <>
      <ScaffoldNote>
        Card details must be collected by the payment provider's hosted form.
        BillGen never renders a card field of its own, so these inputs stay dead
        permanently — they mark where the provider's iframe will be mounted.
      </ScaffoldNote>
      <ScaffoldField label="Card number (provider-hosted)" />
      <ScaffoldField label="Expiry (provider-hosted)" />
      <ScaffoldButton wouldDo="open the provider's hosted card form">Update payment method</ScaffoldButton>
    </>
  ),
  "settings/security": () => (
    <>
      <ScaffoldNote>
        Backend-ready except one: the session list, revocation, password change
        and sign-in history all have endpoints behind them. Only 2FA has
        nothing. A security score may only count checks that are really
        performed — a meter that rewards an unenforced setting is decoration
        that reads as assurance.
      </ScaffoldNote>
      <ScaffoldHeading>Security score</ScaffoldHeading>
      <ScaffoldMeter percent={0} />
      <ScaffoldHeading>Active sessions</ScaffoldHeading>
      <ScaffoldTable columns={["Device", "Location", "Last active", ""]} rows={2} />
      <ScaffoldButton wouldDo="revoke one refresh token — DELETE /users/me/sessions/{jti}">
        Revoke session
      </ScaffoldButton>
      <ScaffoldHeading>Password</ScaffoldHeading>
      <ScaffoldButton wouldDo="change the password and revoke every other session — POST /users/me/password">
        Change password
      </ScaffoldButton>
      <ScaffoldHeading>Two-factor authentication</ScaffoldHeading>
      <ScaffoldButton wouldDo="start TOTP enrolment">Enable 2FA</ScaffoldButton>
      <ScaffoldHeading>Sign-in history</ScaffoldHeading>
      <ScaffoldTable columns={["When", "Event", "Session"]} rows={3} />
      <ScaffoldNote>
        Buildable today from GET /activity/security — sign-ins, sign-outs,
        revocations and password changes are all in the log. What is missing is
        the failure side: no wrong password is ever recorded, so this list can
        show every successful entry and none of the attempts.
      </ScaffoldNote>
    </>
  ),
  "settings/team": () => (
    <>
      <ScaffoldTable columns={["Name", "Email", "Role", "Status"]} />
      <ScaffoldNote>
        Partly wired: GET /orgs/current/members lists the roles and PATCH sets
        one, refusing to let the last owner strand the organization. The four
        roles are owner, admin, member and viewer, enforced by api/authz. What
        is missing is the invitation, which needs email (B1) — every org has
        exactly one member until then.
      </ScaffoldNote>
      <ScaffoldButton wouldDo="email an invitation">Invite user</ScaffoldButton>
    </>
  ),
  "settings/privacy": () => (
    <>
      <ScaffoldNote>
        The register behind this screen is real — GET /trust/privacy/register
        returns the art. 30 processing register and the subprocessor list, so
        the reading half can be built now. The two buttons below are what is
        still missing.
      </ScaffoldNote>
      <ScaffoldHeading>What we hold about you</ScaffoldHeading>
      <ScaffoldTable columns={["Data", "Purpose", "Lawful basis", "Retention"]} rows={6} />
      <ScaffoldHeading>Your data</ScaffoldHeading>
      <ScaffoldButton wouldDo="produce a structured GDPR subject-access export">
        Download my data
      </ScaffoldButton>
      <ScaffoldButton wouldDo="start the account-deletion workflow">Delete my account</ScaffoldButton>
      <ScaffoldNote>
        The deletion dialog must print the register's `retained_on_erasure`
        list. Issued invoices and the client contacts on them are frozen for
        seven years by Belgian bookkeeping law, so an unqualified "delete
        everything" is a promise the product is not allowed to keep.
      </ScaffoldNote>
      <ScaffoldHeading>Consent</ScaffoldHeading>
      <ScaffoldTable columns={["Purpose", "Given", "Date"]} rows={2} />
    </>
  ),
  "settings/cookies": () => (
    <>
      <ScaffoldTable columns={["Category", "Purpose", "Running today", "Enabled"]} rows={4} />
      <ScaffoldNote>
        The four categories and their defaults come from
        GET /trust/consent/categories: essential is locked on, and nothing else
        may be pre-ticked — a pre-ticked box is not consent. Three of the four
        have nothing running in them, which is the only reason no banner ships
        yet. What is missing is storage: a decision has nowhere to be written.
      </ScaffoldNote>
      <ScaffoldButton wouldDo="record the choice with a timestamp and the policy version">
        Save preferences
      </ScaffoldButton>
    </>
  ),
  "settings/integrations": () => (
    <>
      <ScaffoldTable columns={["Integration", "Status", ""]} rows={4} />
      <ScaffoldNote>
        Peppol is the exception worth calling out: BillGen already produces
        Helger-validated BIS 3.0 XML, but nothing transmits it. An Access Point
        connection turns an existing export into an actual e-invoicing feature.
      </ScaffoldNote>
      <ScaffoldButton wouldDo="connect a Peppol Access Point">Connect Peppol</ScaffoldButton>
    </>
  ),
  "explore/search": () => (
    <>
      <ScaffoldField label="Search invoices, clients, products, documents" />
      <ScaffoldNote>
        The ⌘K palette navigates between pages. It cannot find an invoice by
        number or a client by VAT, because no endpoint searches across entities.
      </ScaffoldNote>
      <ScaffoldTable columns={["Type", "Match", "Context"]} />
    </>
  ),
  "help/status": () => (
    <>
      <ScaffoldTable columns={["Subsystem", "Status", "Checked"]} rows={5} />
      <ScaffoldNote>
        /healthz and /readyz are real and already report whether the PDF engine
        is available. Email, payments and Peppol transport have no health signal
        because those subsystems do not exist yet.
      </ScaffoldNote>
    </>
  ),
  "onboarding/wizard": () => (
    <>
      <ScaffoldNote>
        Nine intended steps: activity, company, VAT, bank account, numbering,
        branding, invoice template, first client, first invoice. Steps 6 and 7
        have no endpoints; the rest exist but nothing records progress, so the
        wizard cannot be resumed.
      </ScaffoldNote>
      <ScaffoldTable columns={["Step", "Backend", "Resumable"]} rows={9} />
    </>
  ),

  // ------------------------------------------------------------- L4 — trust
  //
  //  Added 2026-09-04 with core/trust. Everything below has a registry or an
  //  endpoint behind it now, so these sketches describe screens that can be
  //  built rather than features waiting on a decision. Where a screen would be
  //  empty, the sketch says why it is empty — an unexplained blank in a trust
  //  surface reads as reassurance, which is the failure mode this whole layer
  //  is about.

  "activity/user": () => (
    <>
      <ScaffoldField label="Who" />
      <ScaffoldTable columns={["When", "Who", "Action", "Record"]} />
      <ScaffoldNote>
        Backend-ready: GET /activity?actor_user_id filters in SQL. Until
        invitations exist every organization has exactly one member, so the
        picker has one entry — worth building anyway, because the filter is the
        part that would otherwise be retrofitted onto a growing table.
      </ScaffoldNote>
    </>
  ),
  "activity/security": () => (
    <>
      <ScaffoldTable columns={["When", "Severity", "Event", "Who"]} rows={3} />
      <ScaffoldNote>
        GET /activity/security is a filter over the audit log — six of the
        fourteen actions, classified by exposure. A full backup export ranks
        above a sign-in; a restore ranks above both.
      </ScaffoldNote>
      <ScaffoldHeading>Not being watched</ScaffoldHeading>
      <ScaffoldNote>
        The response carries a `not_recorded` list and this screen must render
        it. Sign-ins, sign-outs, session revocations and password changes are
        all recorded — a *failed* sign-in is not, anywhere in the stack, so a
        hundred wrong passwords in a minute leave no trace. An empty row here
        must never read as calm. Showing the blind spot is the feature.
      </ScaffoldNote>
    </>
  ),
  "activity/system": () => (
    <>
      <ScaffoldTable columns={["When", "Subsystem", "Event", "Outcome"]} />
      <ScaffoldNote>
        Distinct from security events: this is the app talking about itself —
        migrations, scheduled jobs, failed deliveries. Nothing runs on a
        schedule yet, so there is genuinely nothing to report; the screen waits
        on a job runner, not on an endpoint.
      </ScaffoldNote>
    </>
  ),
  "documents/trash": () => (
    <>
      <ScaffoldTable columns={["Document", "Deleted", "Deleted by", "Purges on"]} />
      <ScaffoldNote>
        Blocked on B2 (no blob storage). Design constraint worth fixing before
        it is built: deletion here is a retention window, not destruction —
        a soft delete with a purge date, so GDPR erasure and the seven-year
        bookkeeping retention can disagree in public rather than silently.
      </ScaffoldNote>
    </>
  ),

  //  The Legal section. One registry (GET /trust/legal/documents) backs all of
  //  it, and every document in that registry is undrafted — which is exactly
  //  what these pages should say. Drafting is a lawyer's work; what engineering
  //  owes is a page that states the status honestly instead of 404-ing.
  legal: () => (
    <>
      <ScaffoldTable columns={["Document", "Status", "Version", "Blocks"]} rows={7} />
      <ScaffoldNote>
        Served publicly so the marketing site and the app read one source
        (ROADMAP_IA §5, "write once, mount twice"). Seven documents, none
        drafted. The registry knows which, and what each one blocks — legal
        notices are already overdue, because the pre-sale site is live.
      </ScaffoldNote>
    </>
  ),
  "legal/terms": () => (
    <>
      <ScaffoldNote>
        No drafted text. Beyond the prose this needs a version and a per-user
        acceptance record: a term nobody can prove was shown is a term you do
        not have.
      </ScaffoldNote>
      <ScaffoldTable columns={["Version", "Effective", "Accepted by you", "On"]} rows={1} />
    </>
  ),
  "legal/privacy": () => (
    <>
      <ScaffoldNote>
        No drafted text — but the substance exists as data:
        GET /trust/privacy/register returns the art. 30 processing register
        this document has to agree with, field for field. Draft from the
        register, not from memory.
      </ScaffoldNote>
      <ScaffoldTable columns={["Data", "Purpose", "Lawful basis", "Retention"]} rows={6} />
    </>
  ),
  "legal/cookies": () => (
    <>
      <ScaffoldNote>
        No drafted text. The category table it must describe is already served
        at GET /trust/consent/categories, and three of the four categories have
        nothing running in them.
      </ScaffoldNote>
      <ScaffoldTable columns={["Category", "Purpose", "Running today"]} rows={4} />
    </>
  ),
  "legal/dpa": () => (
    <>
      <ScaffoldNote>
        The document that gates every B2B sale. BillGen is the processor and
        the customer the controller — their clients' names and addresses are on
        every invoice. Needs drafting, a countersignature flow, and it must
        name the subprocessor list below it.
      </ScaffoldNote>
      <ScaffoldButton wouldDo="countersign the DPA and store the executed copy">
        Request signed DPA
      </ScaffoldButton>
    </>
  ),
  "legal/subprocessors": () => (
    <>
      <ScaffoldTable columns={["Provider", "Purpose", "Location", "In use"]} rows={6} />
      <ScaffoldNote>
        Served from GET /trust/subprocessors with an `in_use` flag, so a
        planned provider is never published as a current one. Two are live
        today; the rest are placeholders the roadmap implies. Verify every row
        against a signed contract before this page is published, and add change
        notification — the DPA has to promise notice before another is added.
      </ScaffoldNote>
    </>
  ),
  "legal/ai-transparency": () => (
    <>
      <ScaffoldTable columns={["Surface", "Produces", "Confidence", "Marked"]} rows={3} />
      <ScaffoldNote>
        AI-generated output must be identifiable as such, and the duty has
        been live since 2026-08-02 — not 2026-12-02, which is the end of a
        grace period for systems already on the market when the obligation
        applied. BillGen was not, so it never had one (ADR-0005). The date is
        derived in core/trust/ai_transparency.py and the endpoint reports it.
        Nearly free to honour now: the TVA surfaces already carry a confidence
        and wait for a human to confirm before a suggestion counts. The marker
        itself is the missing half, and it belongs beside each machine-made
        value rather than in a banner.
      </ScaffoldNote>
      <ScaffoldNote>
        The boundary to stay behind: Annex III treats creditworthiness
        evaluation of a natural person as high-risk. Explaining and educating
        is minimal-risk; scoring someone's financial standing is not. Any
        surface that starts rating a person needs a conformity assessment, not
        a disclosure line.
      </ScaffoldNote>
    </>
  ),
  "legal/sla": () => (
    <>
      <ScaffoldNote>
        Do not draft this before uptime is measured. /healthz answers a
        request; it does not accumulate availability, and an SLA is a promise
        about a number nobody is recording.
      </ScaffoldNote>
      <ScaffoldMeter percent={0} />
    </>
  ),
  "legal/notices": () => (
    <>
      <ScaffoldField label="Legal entity" />
      <ScaffoldField label="KBO / BCE number" />
      <ScaffoldField label="Registered address" />
      <ScaffoldNote>
        The cheapest document of the seven and the only one already overdue:
        Belgian law requires these on the site itself, and the pre-sale site is
        live. An hour of copying the KBO record, not a drafting engagement.
      </ScaffoldNote>
    </>
  ),
};

// ---------------------------------------------------------------- lookup util

function findNode(key: string): IaNode | undefined {
  const walk = (nodes: IaNode[]): IaNode | undefined => {
    for (const node of nodes) {
      if (node.key === key) return node;
      const hit = walk(node.children ?? []);
      if (hit) return hit;
    }
    return undefined;
  };
  return walk(IA);
}

// ---------------------------------------------- routes that are not IA nodes

/** The invoice builder is an action, not a destination, so it has no IA node. */
export function InvoiceBuilderRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  return (
    <InvoiceBuilderPanel
      companyId={companyId}
      lang={lang}
      onCreated={() => navigate("/app/sales/invoices")}
    />
  );
}
