/** Client 360 — everything the product knows about one client, on one screen.
 *
 *  Three columns, and the split between them is not cosmetic:
 *
 *    left    identity — who this client is. Real, from GET /clients/{id}.
 *    centre  substance — the invoice history. Real, from GET /invoices?client_id.
 *    right   context — the audit trail. Real, from GET /activity?target_id.
 *
 *  Everything else this screen would like to show — tags, risk flags, quotes,
 *  documents, GDPR — maps to a model that does not exist yet (ClientGroup,
 *  GET /reports/clients, Quote, Document). Those render through the scaffold
 *  kit, never through mock data: a fake tag chip is indistinguishable from a
 *  real one, and that is precisely the failure this codebase refuses to ship.
 *
 *  No business math here (see the header of hooks/queries.ts). Per-invoice
 *  amounts are printed exactly as the server sent them; the totals strip that
 *  would sum them is scaffolded, because summing is what GET /clients/{id}/stats
 *  is for and doing it in the browser would make the panel an accounting engine.
 */

import { useState, type ReactNode } from "react";

import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  DataList,
  EmptyState,
  ErrorState,
  KpiCard,
  List,
  PageHeader,
  RecordLayout,
  Skeleton,
  Spinner,
  Table,
  type TableColumn,
  Tabs,
} from "@henrioutai/ui";

import {
  useActivity,
  useClient,
  useClientStats,
  useEraseClientData,
  useExportClientData,
  useInvoices,
} from "../hooks/queries";
import {
  formatDate,
  formatMoney,
} from "../lib/format";
import { documentFilename, saveBlob } from "../lib/download";
import { t, type Lang } from "../lib/translations";
import { findByPath } from "../scaffold/ia";
import {
  ScaffoldBlock,
  ScaffoldButton,
  ScaffoldNote,
  ScaffoldTable,
} from "../scaffold/Scaffold";
import type { InvoiceResponse } from "../types";

export interface Client360PanelProps {
  clientId: string;
  lang?: Lang;
  /** Back to the clients list. */
  onBack?: () => void;
  /** Open one invoice. */
  onOpenInvoice?: (invoiceId: string) => void;
  /** Start a new invoice for this client. */
  onNewInvoice?: () => void;
}

type TabKey = "invoices" | "quotes" | "documents";

/** The invoice lifecycle statuses Badge knows. Anything else stays a tone. */
const BADGE_STATUS = new Set([
  "draft",
  "issued",
  "paid",
  "partially_paid",
  "voided",
]);

export function Client360Panel({
  clientId,
  lang = "en",
  onBack,
  onOpenInvoice,
  onNewInvoice,
}: Client360PanelProps) {
  const [tab, setTab] = useState<TabKey>("invoices");

  const client = useClient(clientId);
  const invoices = useInvoices({ clientId });
  const history = useActivity({ targetId: clientId, limit: 25 });

  if (client.isLoading) return <Spinner label={t(lang, "common.loading")} />;
  if (client.isError || !client.data) {
    return (
      <section className="bg-panel">
        <ErrorState
          title={t(lang, "common.error")}
          description={t(lang, "client360.notFound")}
        />
        {onBack ? (
          <div className="bg-panel__actions">
            <Button variant="secondary" onClick={onBack}>
              {t(lang, "client360.backToClients")}
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  const record = client.data;

  return (
    <section className="bg-client360 bg-stack" aria-label={record.name}>
      <PageHeader
        title={record.name}
        subtitle={[record.vat_number, record.city].filter(Boolean).join(" · ") || undefined}
        onBack={onBack}
        actions={
          onNewInvoice ? (
            <Button onClick={onNewInvoice}>{t(lang, "client360.newInvoice")}</Button>
          ) : undefined
        }
      />

      <RecordLayout
        left={<IdentityRail record={record} lang={lang} />}
        right={<ContextRail history={history} lang={lang} clientId={clientId} />}
      >
        <StatsStrip clientId={clientId} lang={lang} />

        <Card padded={false}>
          <Tabs
            className="bg-client360__tabs"
            items={[
              {
                key: "invoices",
                label: t(lang, "client360.invoices"),
                count: invoices.data?.length,
              },
              { key: "quotes", label: "Quotes" },
              { key: "documents", label: "Documents" },
            ]}
            activeKey={tab}
            onChange={(key) => setTab(key as TabKey)}
          />

          {tab === "invoices" ? (
            <InvoiceHistory
              query={invoices}
              lang={lang}
              onOpenInvoice={onOpenInvoice}
            />
          ) : null}

          {tab === "quotes" ? (
            <div className="bg-client360__tabpanel">
              <ScaffoldBlockFor
                path="sales/quotes"
                title="Quotes for this client"
                body={
                  <ScaffoldNote>
                    A quote is not an invoice with a different label — it needs
                    its own numbering series (quotes are not gapless), a validity
                    date, and a conversion path that turns the accepted one into
                    a draft invoice without retyping it.
                  </ScaffoldNote>
                }
              />
            </div>
          ) : null}

          {tab === "documents" ? (
            <div className="bg-client360__tabpanel">
              <ScaffoldBlockFor
                path="customers/documents"
                title="Documents for this client"
                body={
                  <>
                    <ScaffoldNote>
                      Contracts, purchase orders, signed quotes. Blocked behind
                      blob storage (B2) rather than behind a screen — until a
                      file has somewhere to live, an upload control here would
                      be a control that loses your file.
                    </ScaffoldNote>
                    <ScaffoldTable columns={["Name", "Kind", "Size", "Added"]} rows={2} />
                    <ScaffoldButton wouldDo="upload a document against this client">
                      Upload
                    </ScaffoldButton>
                  </>
                }
              />
            </div>
          ) : null}
        </Card>
      </RecordLayout>
    </section>
  );
}

// -------------------------------------------------------------- left: identity

function IdentityRail({
  record,
  lang,
}: {
  record: NonNullable<ReturnType<typeof useClient>["data"]>;
  lang: Lang;
}) {
  const address = [
    record.address_line1,
    [record.postal_code, record.city].filter(Boolean).join(" "),
    record.country_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Card title={t(lang, "client360.identity")}>
        <div className="bg-client360__identity">
          <Avatar name={record.name} size="lg" />
          <div className="bg-client360__identity-text">
            <p className="bg-client360__name">{record.name}</p>
            <Badge tone={record.is_business ? "info" : "neutral"}>
              {record.is_business
                ? t(lang, "client360.business")
                : t(lang, "client360.individual")}
            </Badge>
          </div>
        </div>

        <DataList
          rows={[
            { key: "vat", label: t(lang, "clients.vat"), value: record.vat_number, mono: true },
            { key: "address", label: t(lang, "clients.address"), value: address },
            { key: "contact", label: t(lang, "client360.contact"), value: record.contact_person },
            {
              key: "email",
              label: t(lang, "clients.email"),
              value: record.email ? (
                <a className="bg-linkish" href={`mailto:${record.email}`}>
                  {record.email}
                </a>
              ) : null,
            },
            { key: "phone", label: t(lang, "client360.phone"), value: record.phone, mono: true },
            { key: "notes", label: t(lang, "client360.notes"), value: record.notes },
          ]}
        />
      </Card>

      <ScaffoldBlockFor
        path="customers/groups"
        title="Tags & groups"
        body={
          <ScaffoldNote>
            Tags are the obvious place to put "late payer" or "public sector",
            and they are the same feature as client groups — one ClientGroup
            model serves both. Nothing on the server stores a label against a
            client today.
          </ScaffoldNote>
        }
      />

      <ScaffoldBlockFor
        path="reports/clients"
        title="Risk flags"
        body={
          <ScaffoldNote>
            Average days-to-payment, share of invoices paid late, outstanding
            beyond terms. GET /reports/clients now aggregates the money half —
            invoiced, paid, outstanding, overdue — and none of the risk half.
            Every input is in the database; what is missing is the aggregation,
            not the data.
          </ScaffoldNote>
        }
      />
    </>
  );
}

// ------------------------------------------------------------- centre: invoices

function StatsStrip({ clientId, lang }: { clientId: string; lang: Lang }) {
  //  Four of the five figures the header was drawn for. The fifth, average
  //  days to pay, is on the wire (`average_days_to_payment`) and waits only for
  //  a label in every language — this file does not invent Dutch copy.
  const stats = useClientStats(clientId);
  if (stats.isLoading) {
    return (
      <div className="bg-kpi-grid" aria-busy="true">
        <Skeleton variant="block" height="5.5rem" />
        <Skeleton variant="block" height="5.5rem" />
        <Skeleton variant="block" height="5.5rem" />
        <Skeleton variant="block" height="5.5rem" />
      </div>
    );
  }
  if (stats.isError || !stats.data) {
    return (
      <div className="bg-client360__tabpanel" role="alert">
        {t(lang, "common.error")}
      </div>
    );
  }
  const { currency } = stats.data;
  return (
    <section className="bg-kpi-grid" aria-label={t(lang, "client360.invoices")}>
      <KpiCard
        label={t(lang, "dashboard.invoiced")}
        value={formatMoney(stats.data.invoiced_total, currency, lang)}
        //  Issued documents only. `invoice_count` includes drafts, and a
        //  draft is not invoiced — the browser check on Big Corp NV showed
        //  "5" over a total that only two of them made up.
        hint={String(stats.data.invoice_count - stats.data.draft_count)}
      />
      <KpiCard
        label={t(lang, "dashboard.paid")}
        value={formatMoney(stats.data.paid_total, currency, lang)}
      />
      <KpiCard
        label={t(lang, "dashboard.outstanding")}
        value={formatMoney(stats.data.outstanding_total, currency, lang)}
      />
      <KpiCard
        label={t(lang, "dashboard.overdue")}
        value={formatMoney(stats.data.overdue_total, currency, lang)}
        hint={String(stats.data.overdue_count)}
      />
    </section>
  );
}

function InvoiceHistory({
  query,
  lang,
  onOpenInvoice,
}: {
  query: ReturnType<typeof useInvoices>;
  lang: Lang;
  onOpenInvoice?: (invoiceId: string) => void;
}) {
  if (query.isLoading) {
    return (
      <div className="bg-client360__tabpanel">
        <Spinner label={t(lang, "common.loading")} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="bg-client360__tabpanel" role="alert">
        {t(lang, "common.error")}
      </div>
    );
  }

  const rows = query.data ?? [];

  const columns: TableColumn<InvoiceResponse>[] = [
    {
      key: "reference",
      label: t(lang, "history.reference"),
      render: (row) => row.reference ?? t(lang, "history.draft"),
    },
    {
      key: "issue_date",
      label: t(lang, "history.date"),
      render: (row) => formatDate(row.issue_date, lang),
    },
    {
      key: "status",
      label: t(lang, "history.status"),
      render: (row) =>
        BADGE_STATUS.has(row.status) ? (
          <Badge status={row.status as "draft" | "issued" | "paid" | "partially_paid" | "voided"} />
        ) : (
          <Badge tone="neutral">{row.status}</Badge>
        ),
    },
    {
      key: "total_ttc",
      label: t(lang, "history.total"),
      numeric: true,
      // Printed, not calculated — the server froze this figure at issue time.
      render: (row) => formatMoney(row.total_ttc, row.currency, lang),
    },
  ];

  return (
    <div className="bg-client360__tabpanel bg-client360__tabpanel--flush">
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={onOpenInvoice ? (row) => onOpenInvoice(row.id) : undefined}
        empty={<EmptyState title={t(lang, "client360.noInvoices")} />}
      />
    </div>
  );
}

// --------------------------------------------------------------- right: context

function ContextRail({
  history,
  lang,
  clientId,
}: {
  history: ReturnType<typeof useActivity>;
  lang: Lang;
  clientId: string;
}) {
  const returned = history.data ?? [];

  // Trust the parameter, verify the answer. FastAPI silently DISCARDS query
  // parameters it does not declare, so an API older than this build answers
  // ?target_id=… with the entire organization's audit log — logins, PDF
  // exports, other clients — and the card renders it as if it were this
  // client's. Nothing errors; the screen just quietly lies. Dropping the
  // non-matching rows turns that into a visible, explainable state.
  const entries = returned.filter((entry) => entry.target_id === clientId);
  const serverIgnoredFilter = returned.length > entries.length;

  return (
    <>
      <Card title={t(lang, "client360.recordActivity")}>
        <p className="bg-client360__hint">{t(lang, "client360.recordActivityHint")}</p>
        {history.isLoading ? (
          <Spinner label={t(lang, "common.loading")} />
        ) : history.isError ? (
          <div role="alert">{t(lang, "common.error")}</div>
        ) : serverIgnoredFilter ? (
          <Banner tone="warn">{t(lang, "client360.staleFilter")}</Banner>
        ) : entries.length > 0 ? (
          <List
            items={entries.map((entry) => ({
              key: entry.id,
              primary: entry.action,
              secondary: new Date(entry.timestamp).toLocaleString(),
            }))}
          />
        ) : (
          <EmptyState title={t(lang, "client360.noRecordActivity")} />
        )}
      </Card>

      <PrivacyBlock lang={lang} clientId={clientId} />
    </>
  );
}

// --------------------------------------------------------------- privacy (T-35)

/** A client is a data subject. Export hands over what is held; erasure blanks
 *  the contact channels and keeps what the issued invoices print — the server
 *  decides which is which, and its answer is what the dialog says. */
function PrivacyBlock({ lang, clientId }: { lang: Lang; clientId: string }) {
  const exportData = useExportClientData();
  const erase = useEraseClientData();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <Card>
      <h3 className="bg-card__title">{t(lang, "privacy.title")}</h3>
      <p className="bg-muted">{t(lang, "privacy.hint")}</p>
      <div className="bg-actions">
        <Button
          variant="secondary"
          disabled={exportData.isPending}
          onClick={() => {
            exportData.mutate(clientId, {
              onSuccess: async (data) => {
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                await saveBlob(blob, documentFilename(`client-${clientId}-export`, "json"));
                setNotice(t(lang, "privacy.export.done"));
              },
            });
          }}
        >
          {t(lang, "privacy.export")}
        </Button>
        <Button variant="danger" disabled={erase.isPending} onClick={() => setConfirming(true)}>
          {t(lang, "privacy.erase")}
        </Button>
      </div>
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      {exportData.isError || erase.isError ? (
        <Banner tone="danger">{t(lang, "common.error")}</Banner>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t(lang, "privacy.erase.confirmTitle")}
        confirmLabel={t(lang, "privacy.erase")}
        cancelLabel={t(lang, "common.cancel")}
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          erase.mutate(clientId, { onSuccess: () => setNotice(t(lang, "privacy.erase.done")) });
        }}
      >
        {t(lang, "privacy.erase.confirmBody")}
      </ConfirmDialog>
    </Card>
  );
}

// ------------------------------------------------------------------- kit glue

/** ScaffoldBlock addressed by IA path, so a node that gets renamed or gains an
 *  endpoint updates this screen without anyone editing this file. */
function ScaffoldBlockFor({
  path,
  title,
  body,
}: {
  path: string;
  title: string;
  body: ReactNode;
}) {
  const node = findByPath(path);
  if (!node) return null;
  return (
    <ScaffoldBlock node={node} title={title}>
      {body}
    </ScaffoldBlock>
  );
}
