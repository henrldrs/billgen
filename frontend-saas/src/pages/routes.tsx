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
  Card,
  ClientsPanel,
  CompanyForm,
  DashboardPanel,
  HistoryPanel,
  IA,
  ImportPanel,
  InvoiceBuilderPanel,
  List,
  PageHeader,
  ProductsPanel,
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
  coverage,
  routableNodes,
  t,
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
}

type Screen = (props: ScreenProps) => ReactNode;

/** Read the shell context and render either the built screen or its scaffold. */
function IaScreen({ node }: { node: IaNode }) {
  const { companyId, lang } = useOutletContext<ShellContext>();
  const Built = BUILT[node.path as string];
  if (Built) return <Built node={node} companyId={companyId} lang={lang} />;
  const sketch = SKETCHES[node.path as string];
  return <ScaffoldPage node={node}>{sketch?.()}</ScaffoldPage>;
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
function DashboardScreen({ companyId, lang }: ScreenProps) {
  const alerts = findNode("dashboard.alerts");
  return (
    <>
      <PageHeader title={t(lang, "dashboard.title")} />
      <DashboardPanel companyId={companyId} lang={lang} />
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
            primary: entry.action,
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
      <HistoryPanel key={status ?? "all"} companyId={companyId} lang={lang} status={status} />
    </>
  );
}

/** Company details: the one form that exists, plus the eight sub-areas that
 *  cannot be edited because /companies has no PATCH. */
function CompanyScreen({ node, lang }: ScreenProps) {
  const { data: companies } = useCompanies();
  return (
    <>
      <PageHeader
        title={node.label}
        subtitle="Create works. Editing does not — /companies has no PATCH."
      />
      {companies && companies.length > 0 ? (
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

/** Settings keeps the rail, but every section in the IA now has a home. */
function SettingsScreen({ lang }: ScreenProps) {
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();
  const settings = findNode("settings");
  const sections = settings?.children ?? [];

  return (
    <>
      <PageHeader title={t(lang, "company.title")} />
      <SettingsShell
        sections={sections.map((section) => ({
          key: section.key,
          label: section.label,
        }))}
        activeKey="settings.appearance"
        onSectionChange={(key) => {
          const target = sections.find((section) => section.key === key);
          if (target?.path) navigate(`/app/${target.path}`);
        }}
      >
        <Card title="Appearance">
          <ThemeSwitcher theme={theme} onChange={setTheme} />
        </Card>
      </SettingsShell>
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

  // customers & catalog
  "customers/clients": ({ companyId, lang }) => (
    <ClientsPanel companyId={companyId} lang={lang} />
  ),
  "catalog/products": ({ companyId, lang }) => (
    <ProductsPanel companyId={companyId} lang={lang} />
  ),

  // company & settings
  "company/profile": CompanyScreen,
  settings: SettingsScreen,
  "settings/appearance": SettingsScreen,
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
  "billing/usage": () => (
    <>
      <ScaffoldHeading>Plan usage</ScaffoldHeading>
      <ScaffoldNote>Invoices, clients, storage and seats — all unmetered today.</ScaffoldNote>
      <ScaffoldMeter percent={0} />
      <ScaffoldMeter percent={0} />
      <ScaffoldMeter percent={0} />
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

/** Invoice detail — scaffolded: the per-invoice timeline has no endpoint. */
export function InvoiceDetailRoute() {
  const { invoiceId } = useParams();
  const node = findNode("sales.invoice.detail");
  if (!node) return null;
  return (
    <ScaffoldPage node={node}>
      <ScaffoldNote>Invoice {invoiceId}</ScaffoldNote>
      <ScaffoldHeading>Status timeline</ScaffoldHeading>
      <ScaffoldTable columns={["Event", "When", "By"]} rows={4} />
      <ScaffoldNote>
        Created, issued and paid are recoverable from the invoice row itself.
        Sent, delivered and viewed are not — those states do not exist in
        InvoiceStatus, and /activity filters by target_type rather than
        target_id, so a true per-invoice history cannot be assembled.
      </ScaffoldNote>
      <ScaffoldButton wouldDo="email the invoice to the client">Send</ScaffoldButton>
      <ScaffoldButton wouldDo="copy this invoice into a new draft">Duplicate</ScaffoldButton>
    </ScaffoldPage>
  );
}

/** Client 360 — scaffolded: no per-client stats or invoice filter exists. */
export function ClientDetailRoute() {
  const { clientId } = useParams();
  const node = findNode("customers.detail");
  if (!node) return null;
  return (
    <ScaffoldPage node={node}>
      <ScaffoldNote>Client {clientId}</ScaffoldNote>
      <ScaffoldHeading>Overview</ScaffoldHeading>
      <ScaffoldTable
        columns={["Total invoiced", "Paid", "Outstanding", "Overdue", "Avg. payment days"]}
        rows={1}
      />
      <ScaffoldHeading>Tabs</ScaffoldHeading>
      <ScaffoldNote>
        Overview, Invoices and Activity could be assembled client-side today by
        fetching every invoice and filtering — correct but unscalable. Quotes
        and Documents have no backend at all.
      </ScaffoldNote>
    </ScaffoldPage>
  );
}
