/** Dashboard — the numbers, the chart, the shortcuts, the last few events.
 *
 *  Redrawn 2026-09-13 from Henri's `docs/dashboard nice to have.txt`, taking
 *  what the server can already answer and nothing it cannot:
 *
 *    · the KPI bar keeps invoiced / paid / outstanding / overdue and gains the
 *      VAT to set aside this quarter — `GET /reports/vat` for the current
 *      quarter, which is real money the accountant will ask for;
 *    · the "no invoices" state is a card with the two actions that fix it,
 *      not a sentence in a table;
 *    · quick actions are the four things a freelancer does in a week;
 *    · recent activity moves into a small card on the right, worded as "what
 *      happened to what" rather than a raw table.
 *
 *  Absent on purpose: the agenda, unbilled appointments, the forecast, the
 *  effective hourly rate and client concentration. Each needs a model
 *  (appointments, time) that does not exist, and a card over an invented
 *  number is the one thing a dashboard must not carry. The spec's "safe to
 *  spend" is a tax estimate BillGen is not licensed to make.
 *
 *  Every figure is the server's. The panel formats and lays out; it never
 *  adds two numbers the API did not.
 *
 *  The title row belongs to the route (shell/routes.tsx renders a PageHeader
 *  above this), so this panel renders only its own content.
 */

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  Skeleton,
  Table,
  type TableColumn,
} from "@henrioutai/ui";

import { useActivity, useKpi, useRevenue, useVatReport } from "../hooks/queries";
import { formatMoney, monthName } from "../lib/format";
import { t, tAuditAction, tf, type Lang } from "../lib/translations";
import type { ActivityEntryResponse } from "../types";
import { MonthlyRevenueChart } from "./RevenueReportPanel";

export interface DashboardPanelProps {
  companyId: string;
  lang?: Lang;
  year?: number;
  /** ISO date used as "today" for overdue computation — mainly for tests. */
  today?: string;
  /** Currency to label the KPI figures with. /reports/kpi returns bare
   *  decimals, so the shell passes the active company's default. */
  currency?: string;
  /** The quick actions. Navigation is the route's business, so each is a
   *  callback; one that is not supplied is not offered. */
  onNewInvoice?: () => void;
  onNewClient?: () => void;
  onNewProduct?: () => void;
  onBackup?: () => void;
  /** "See everything" under the activity card. */
  onOpenActivity?: () => void;
}

interface MonthRow {
  month: number;
  total: string;
}

const FEED_LENGTH = 6;

/** "2026-Q3" for a date — the same period grammar `GET /reports/vat` reads. */
function quarterOf(iso: string | undefined): string {
  const date = iso ? new Date(`${iso}T00:00:00`) : new Date();
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

export function DashboardPanel({
  companyId,
  lang = "en",
  year = new Date().getFullYear(),
  today,
  currency = "EUR",
  onNewInvoice,
  onNewClient,
  onNewProduct,
  onBackup,
  onOpenActivity,
}: DashboardPanelProps) {
  const kpi = useKpi(companyId, today);
  const revenue = useRevenue(companyId, year);
  const quarter = quarterOf(today);
  const vat = useVatReport(companyId, quarter);
  const activity = useActivity({ limit: FEED_LENGTH });

  if (kpi.isError || revenue.isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => {
            void kpi.refetch();
            void revenue.refetch();
          }}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  const loading = kpi.isLoading || revenue.isLoading;

  const rows: MonthRow[] = Object.entries(revenue.data?.months ?? {})
    .map(([month, total]) => ({ month: Number(month), total: String(total) }))
    .sort((a, b) => a.month - b.month);

  const columns: TableColumn<MonthRow>[] = [
    {
      key: "month",
      label: t(lang, "dashboard.month"),
      render: (row) => monthName(row.month, lang),
    },
    {
      key: "total",
      label: t(lang, "dashboard.invoiced"),
      numeric: true,
      render: (row) => formatMoney(row.total, currency, lang),
    },
  ];

  const counts = kpi.data?.counts ?? {};
  const invoiceCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const overdue = kpi.data?.overdue_count ?? 0;
  const nothingYet = !loading && kpi.data != null && invoiceCount === 0;

  const actions = [
    onNewInvoice && { key: "invoice", label: t(lang, "dashboard.newInvoice"), hint: t(lang, "dashboard.newInvoiceHint"), run: onNewInvoice },
    onNewClient && { key: "client", label: t(lang, "dashboard.newClient"), hint: t(lang, "dashboard.newClientHint"), run: onNewClient },
    onNewProduct && { key: "product", label: t(lang, "dashboard.newProduct"), hint: t(lang, "dashboard.newProductHint"), run: onNewProduct },
    onBackup && { key: "backup", label: t(lang, "dashboard.backup"), hint: t(lang, "dashboard.backupHint"), run: onBackup },
  ].filter((action): action is Exclude<typeof action, false | undefined> => Boolean(action));

  return (
    <section className="bg-stack" aria-label={t(lang, "dashboard.title")}>
      {nothingYet ? (
        <Card>
          <div className="bg-dash__welcome">
            <div className="bg-dash__welcome-text">
              <h2>{t(lang, "dashboard.welcomeTitle")}</h2>
              <p>{t(lang, "dashboard.welcomeBody")}</p>
            </div>
            {onNewInvoice || onNewClient ? (
              <div className="bg-dash__welcome-actions">
                {onNewInvoice ? (
                  <Button variant="primary" onClick={onNewInvoice}>
                    {t(lang, "dashboard.newInvoice")}
                  </Button>
                ) : null}
                {onNewClient ? (
                  <Button variant="secondary" onClick={onNewClient}>
                    {t(lang, "dashboard.newClient")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="bg-kpi-grid">
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
          <Skeleton variant="block" height="5.5rem" />
        </div>
      ) : (
        <div className="bg-kpi-grid">
          <KpiCard
            label={t(lang, "dashboard.invoiced")}
            value={formatMoney(kpi.data?.invoiced_total ?? 0, currency, lang)}
            hint={`${invoiceCount} · ${t(lang, "dashboard.thisYear")}`}
          />
          <KpiCard
            label={t(lang, "dashboard.paid")}
            value={formatMoney(kpi.data?.paid_total ?? 0, currency, lang)}
            hint={tf(lang, "dashboard.paidCount", { n: counts.paid ?? 0 })}
          />
          <KpiCard
            label={t(lang, "dashboard.outstanding")}
            value={formatMoney(kpi.data?.outstanding_total ?? 0, currency, lang)}
            hint={t(lang, "dashboard.outstandingHint")}
          />
          <KpiCard
            label={t(lang, "dashboard.overdue")}
            value={String(overdue)}
            hint={overdue > 0 ? t(lang, "dashboard.overdueSome") : t(lang, "dashboard.overdueNone")}
            delta={overdue > 0 ? { value: String(overdue), direction: "up", positiveIsGood: false } : undefined}
          />
          {vat.isError ? null : (
            <KpiCard
              label={t(lang, "dashboard.vatBuffer")}
              value={
                vat.data ? (
                  formatMoney(vat.data.net_vat, vat.data.currency ?? currency, lang)
                ) : (
                  <Skeleton variant="block" height="1.6rem" />
                )
              }
              hint={tf(lang, "dashboard.vatBufferHint", { period: quarter })}
            />
          )}
        </div>
      )}

      <div className="bg-dash__grid">
        <div className="bg-dash__column">
          <MonthlyRevenueChart rows={rows} year={year} currency={currency} lang={lang} loading={loading} />

          <Card padded={false} title={`${t(lang, "dashboard.revenue")} — ${year}`}>
            {loading ? (
              <div className="bg-report__skeleton">
                <Skeleton lines={4} />
              </div>
            ) : (
              <Table
                columns={columns}
                rows={rows}
                rowKey={(row) => String(row.month)}
                empty={<EmptyState title={t(lang, "reports.noRevenue")} />}
              />
            )}
          </Card>
        </div>

        <div className="bg-dash__column">
          {actions.length > 0 ? (
            <Card title={t(lang, "dashboard.quickActions")}>
              <div className="bg-dash__actions">
                {actions.map((action) => (
                  <button key={action.key} type="button" className="bg-dash__action" onClick={action.run}>
                    <span>{action.label}</span>
                    <span className="bg-dash__action-hint">{action.hint}</span>
                  </button>
                ))}
              </div>
            </Card>
          ) : null}

          <Card
            title={t(lang, "dashboard.recentActivity")}
            actions={
              onOpenActivity ? (
                <Button variant="ghost" size="sm" onClick={onOpenActivity}>
                  {t(lang, "dashboard.seeAll")}
                </Button>
              ) : undefined
            }
          >
            {activity.isLoading ? (
              <Skeleton lines={4} />
            ) : activity.isError || (activity.data ?? []).length === 0 ? (
              <p className="bg-muted">{t(lang, "dashboard.noActivity")}</p>
            ) : (
              <ol className="bg-dash__feed">
                {(activity.data ?? []).slice(0, FEED_LENGTH).map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} lang={lang} />
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

/** "14:02 · Issued — invoice ACME-2026/0007". The reference comes from the
 *  entry's own snapshot when it has one; the log records what changed, so the
 *  name of the record is in there for the actions that carry a snapshot and
 *  absent for the ones (delete, export) that do not. */
function ActivityRow({ entry, lang }: { entry: ActivityEntryResponse; lang: Lang }) {
  const snapshot = (entry.after ?? entry.before ?? {}) as Record<string, unknown>;
  const label =
    typeof snapshot.reference === "string"
      ? snapshot.reference
      : typeof snapshot.name === "string"
        ? snapshot.name
        : null;
  const when = new Date(entry.timestamp);
  return (
    <li className="bg-dash__event">
      <time className="bg-dash__event-when" dateTime={entry.timestamp} title={when.toLocaleString()}>
        {when.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
      </time>
      <span className="bg-dash__event-what">{tAuditAction(lang, entry.action)}</span>
      <span className="bg-dash__event-target">
        {entry.target_type}
        {label ? ` · ${label}` : ""}
      </span>
    </li>
  );
}
