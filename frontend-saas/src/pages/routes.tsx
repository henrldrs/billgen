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

import {
  ActivityPanel,
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
  HistoryPanel,
  IA,
  ImportPanel,
  InvoiceBuilderPanel,
  InvoiceDetailPanel,
  List,
  PageHeader,
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
  ThemeSwitcher,
  UsagePanel,
  VatReportPanel,
  coverage,
  iaTrail,
  routableNodes,
  t,
  tAuditAction,
  useActivity,
  useCompanies,
  type IaNode,
  type Lang,
} from "@billgen/ui";
import type { ReactNode } from "react";
import { Route, useNavigate, useOutletContext, useParams } from "react-router-dom";

import { useTheme } from "../lib/theme";
import type { ShellContext } from "./AppShell";

// ---------------------------------------------------------------- screen glue

interface ScreenProps {
  node: IaNode;
  companyId: string;
  lang: Lang;
  /** The active company's default currency. Report endpoints return bare
   *  decimals, so the screen has to be told what they are denominated in. */
  currency: string;
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
  const { companyId, lang, currency } = useOutletContext<ShellContext>();
  const Built = BUILT[node.path as string];
  const sketch = SKETCHES[node.path as string];

  const body = Built ? (
    <Built node={node} companyId={companyId} lang={lang} currency={currency} />
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
  const trail = iaTrail(node.path as string);

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
  const sections = findNode("settings")?.children ?? [];
  return (
    <SettingsShell
      sections={sections.map((section) => ({
        key: section.key,
        label: section.label,
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

export function buildAppRoutes() {
  return routableNodes()
    .filter((node) => node.path !== undefined)
    .map((node) =>
      node.path === "" ? (
        <Route key={node.key} index element={<IaScreen node={node} />} />
      ) : (
        <Route key={node.key} path={node.path} element={<IaScreen node={node} />} />
      ),
    );
}

// ------------------------------------------------------------- real screens

/** Section landing page: what lives here, and what state each part is in.
 *  This screen needs no backend — it is navigation — so it is built for real,
 *  with the design system rather than the scaffold kit. */
function SectionIndex({ node }: ScreenProps) {
  const navigate = useNavigate();
  const stats = coverage([node]);
  const children = node.children ?? [];

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

/** Dashboard: real KPIs and revenue, real recent activity, scaffolded alerts. */
function DashboardScreen({ companyId, lang, currency }: ScreenProps) {
  const alerts = findNode("dashboard.alerts");
  return (
    <>
      <PageHeader title={t(lang, "dashboard.title")} />
      <DashboardPanel companyId={companyId} lang={lang} currency={currency} />
      <RecentActivityCard lang={lang} />
      {alerts ? (
        <ScaffoldPage node={alerts}>
          <ScaffoldNote>
            Intended content: overdue invoices, clients missing VAT or address,
            and plan-limit warnings — each a link into the screen that fixes it.
          </ScaffoldNote>
          <ScaffoldTable columns={["Severity", "Message", "Action"]} rows={3} />
        </ScaffoldPage>
      ) : null}
    </>
  );
}

function RecentActivityCard({ lang }: { lang: Lang }) {
  const { data } = useActivity({ limit: 8 });
  return (
    <Card title={t(lang, "activity.title")}>
      {data && data.length > 0 ? (
        <List
          items={data.map((entry, index) => ({
            key: `${entry.timestamp}-${index}`,
            // The wire value ("export_pdf") is a contract, not a label.
            primary: tAuditAction(lang, entry.action),
            secondary: new Date(entry.timestamp).toLocaleString(),
          }))}
        />
      ) : (
        <p>{t(lang, "activity.empty")}</p>
      )}
    </Card>
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

/** Company profile: the edit form over PATCH /companies/{id} (B3), with the
 *  create form kept underneath — the onboarding gate is the only other place a
 *  company can be created, and it only ever runs once, so dropping it here
 *  would leave a one-company-per-account product by accident. */
function CompanyScreen({ node, companyId, lang }: ScreenProps) {
  const { data: companies } = useCompanies();
  return (
    <>
      <CompanySettingsPanel
        companyId={companyId}
        section="profile"
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

/** Appearance — the one settings section with something real to change. The
 *  rail around it is supplied by SettingsFrame, so this renders only its own
 *  content; rendering the shell here is what used to make the rail a property
 *  of two screens instead of the section. */
function AppearanceScreen({ node }: ScreenProps) {
  const [theme, setTheme] = useTheme();
  return (
    <>
      <PageHeader title={node.label} />
      <Card title="Appearance">
        <ThemeSwitcher theme={theme} onChange={setTheme} />
      </Card>
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
  company: SectionIndex,
  billing: SectionIndex,
  documents: SectionIndex,
  explore: SectionIndex,
  activity: SectionIndex,
  help: SectionIndex,
  legal: SectionIndex,
  onboarding: SectionIndex,
  desktop: SectionIndex,

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
  "sales/invoices/id/:invoiceId": ({ lang }) => {
    const { invoiceId } = useParams();
    const navigate = useNavigate();
    if (!invoiceId) return null;
    return (
      <InvoiceDetailPanel
        invoiceId={invoiceId}
        lang={lang}
        onBack={() => navigate("/app/sales/invoices")}
        onOpenClient={(clientId) => navigate(`/app/customers/clients/${clientId}`)}
        onDeleted={() => navigate("/app/sales/invoices")}
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

  // billing — the entitlement layer's two screens. Everything else under
  // Billing waits on a payment provider; these two need none, because usage and
  // the plan matrix are already served (GET /entitlements, GET /plans).
  "billing/usage": ({ lang }) => {
    const navigate = useNavigate();
    return <UsagePanel lang={lang} onSeePlans={() => navigate("/app/billing/plan")} />;
  },
  "billing/plan": ({ lang }) => <PlansPanel lang={lang} />,

  // reports - VAT. The most valuable report in a Belgian invoicing product and
  // the last one without a screen; the endpoint has existed for months.
  // Unlike the other report screens, this panel owns its own PageHeader - the
  // period it is showing belongs in the subtitle, next to the title.
  "reports/vat": ({ companyId, lang }) => (
    <VatReportPanel companyId={companyId} lang={lang} />
  ),

  // company & settings. The landing is a SectionIndex like every other
  // section; the rail belongs to the CHILDREN (see SettingsFrame).
  // company — five of these six areas are one PATCH against one row, so they
  // are one panel behind a `section` prop rather than five forms that could
  // disagree about what a company is. The IA's label is passed down so the
  // page title matches the nav item that led here.
  "company/profile": CompanyScreen,
  "company/legal": ({ node, companyId, lang }) => (
    <CompanySettingsPanel companyId={companyId} section="legal" lang={lang} title={node.label} />
  ),
  "company/vat": ({ node, companyId, lang }) => (
    <CompanySettingsPanel companyId={companyId} section="vat" lang={lang} title={node.label} />
  ),
  "company/bank": ({ node, companyId, lang }) => (
    <CompanySettingsPanel companyId={companyId} section="bank" lang={lang} title={node.label} />
  ),
  "company/numbering": ({ node, companyId, lang }) => (
    <CompanySettingsPanel
      companyId={companyId}
      section="numbering"
      lang={lang}
      title={node.label}
    />
  ),
  "company/defaults": ({ node, companyId, lang }) => (
    <CompanySettingsPanel
      companyId={companyId}
      section="defaults"
      lang={lang}
      title={node.label}
    />
  ),
  settings: SectionIndex,
  "settings/appearance": AppearanceScreen,
  "settings/import": ({ lang }) => <ImportPanel lang={lang} />,
  "settings/backup": ({ lang }) => <BackupPanel lang={lang} />,
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
      <ScaffoldHeading>Security score</ScaffoldHeading>
      <ScaffoldMeter percent={0} />
      <ScaffoldHeading>Active sessions</ScaffoldHeading>
      <ScaffoldTable columns={["Device", "Location", "Last active", ""]} rows={2} />
      <ScaffoldButton wouldDo="revoke one refresh token">Revoke session</ScaffoldButton>
      <ScaffoldHeading>Two-factor authentication</ScaffoldHeading>
      <ScaffoldButton wouldDo="start TOTP enrolment">Enable 2FA</ScaffoldButton>
    </>
  ),
  "settings/team": () => (
    <>
      <ScaffoldTable columns={["Name", "Email", "Role", "Status"]} />
      <ScaffoldNote>
        Roles the product needs: owner, administrator, accountant, employee,
        viewer. OrgMembership exists in core/models but carries no role field.
      </ScaffoldNote>
      <ScaffoldButton wouldDo="email an invitation">Invite user</ScaffoldButton>
    </>
  ),
  "settings/privacy": () => (
    <>
      <ScaffoldHeading>Your data</ScaffoldHeading>
      <ScaffoldButton wouldDo="produce a structured GDPR subject-access export">
        Download my data
      </ScaffoldButton>
      <ScaffoldButton wouldDo="start the account-deletion workflow">Delete my account</ScaffoldButton>
      <ScaffoldHeading>Consent</ScaffoldHeading>
      <ScaffoldTable columns={["Purpose", "Given", "Date"]} rows={2} />
    </>
  ),
  "settings/cookies": () => (
    <>
      <ScaffoldTable columns={["Category", "Purpose", "Enabled"]} rows={3} />
      <ScaffoldNote>
        Essential is always on. Analytics and marketing must default to off and
        record consent with a timestamp. No analytics run today, which is the
        only reason this is not already a compliance gap.
      </ScaffoldNote>
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
