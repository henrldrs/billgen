/** What needs attention — the dashboard's alerts card, over `GET /alerts`.
 *
 *  The rules live on the server (`core/services/alerts_service.py`) and this
 *  card holds none of its own: it receives a `code` and a `context` per alert
 *  and turns them into a sentence in the interface language. That split is
 *  the whole design — "overdue" is decided once, where the invoice report
 *  and the KPI decide it, and a sentence assembled here is translatable in a
 *  way a sentence assembled there would not be.
 *
 *  Worst first, as the server orders them. The header counts cover every
 *  alert that fired; the list is capped, and when it is the card says how
 *  many it is not showing rather than letting a badge of 8 sit over a list
 *  of 5. Each row ends in the one action that makes it go away: the invoice,
 *  the client, or the company's own identifiers.
 *
 *  A code this UI does not know — a fifth rule the server grew — renders
 *  its title and the raw code rather than nothing: an unreadable alert is
 *  better than a silently dropped one. */

import { Badge, Button, Card, Skeleton } from "@henrioutai/ui";

import { useAlerts } from "../hooks/queries";
import { formatMoney } from "../lib/format";
import { hasMessage, t, tf, type Lang, type MessageKey } from "../lib/translations";
import type { AlertResponse } from "../types";

export interface AlertsPanelProps {
  companyId: string;
  lang?: Lang;
  /** ISO date used as "today" — mainly for tests. */
  today?: string;
  /** For the draft amounts, which carry no currency of their own. */
  currency?: string;
  /** How many rows to show; the header counts are never capped. */
  limit?: number;
  /** Where a row's action goes. The route decides; omitted = no action. */
  onOpen?: (alert: AlertResponse) => void;
  /** The element id the top bar's bell scrolls to. */
  id?: string;
}

const SEVERITY_TONE: Record<string, "danger" | "warn" | "info"> = {
  critical: "danger",
  warning: "warn",
  info: "info",
};

const SEVERITY_ORDER = ["critical", "warning", "info"] as const;

function str(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(str).filter(Boolean) : [];
}

/** The sentence for one alert, from its code and context. */
export function alertSentence(lang: Lang, alert: AlertResponse, currency: string): string {
  const ctx = alert.context as Record<string, unknown>;
  switch (alert.code) {
    case "invoice.overdue":
      return tf(lang, "alerts.invoice.overdue", {
        days: str(ctx.days_overdue),
        outstanding: formatMoney(str(ctx.outstanding) || "0", str(ctx.currency) || currency, lang),
      });
    case "invoice.draft_stale":
      return tf(lang, "alerts.invoice.draft_stale", {
        days: str(ctx.days),
        amount: formatMoney(str(ctx.amount) || "0", currency, lang),
      });
    case "client.missing_vat_number":
      return t(lang, "alerts.client.missing_vat_number");
    case "company.incomplete": {
      const invalid = list(ctx.invalid_fields);
      const peppol = list(ctx.missing_for_peppol);
      const parts: string[] = [];
      if (invalid.length) parts.push(tf(lang, "alerts.company.incomplete", { fields: invalid.join(", ") }));
      if (peppol.length) parts.push(tf(lang, "alerts.company.peppol", { fields: peppol.join(", ") }));
      return parts.join(" · ");
    }
    default:
      return alert.code;
  }
}

function actionLabel(lang: Lang, alert: AlertResponse): string | null {
  const key = `alerts.open.${alert.target_type}`;
  return hasMessage(key) ? t(lang, key as MessageKey) : null;
}

export function AlertsPanel({
  companyId,
  lang = "en",
  today,
  currency = "EUR",
  limit = 8,
  onOpen,
  id = "bg-alerts",
}: AlertsPanelProps) {
  const alerts = useAlerts(companyId, today, limit);
  const data = alerts.data;
  const total = Object.values(data?.counts_by_severity ?? {}).reduce((sum, n) => sum + n, 0);
  const shown = data?.alerts.length ?? 0;

  return (
    <Card
      id={id}
      title={t(lang, "alerts.title")}
      actions={
        data && total > 0 ? (
          <div className="bg-alerts__counts">
            {SEVERITY_ORDER.filter((severity) => (data.counts_by_severity[severity] ?? 0) > 0).map((severity) => (
              <Badge key={severity} tone={SEVERITY_TONE[severity]}>
                {data.counts_by_severity[severity]} {t(lang, `alerts.severity.${severity}` as const)}
              </Badge>
            ))}
          </div>
        ) : undefined
      }
    >
      {alerts.isLoading ? (
        <Skeleton lines={3} />
      ) : alerts.isError || !data ? (
        <p className="bg-muted">{t(lang, "common.error")}</p>
      ) : total === 0 ? (
        <p className="bg-alerts__clear">
          <span className="bg-alerts__dot bg-alerts__dot--clear" aria-hidden="true" />
          {t(lang, "alerts.empty")}
        </p>
      ) : (
        <>
          <ol className="bg-alerts">
            {data.alerts.map((alert) => {
              const label = onOpen ? actionLabel(lang, alert) : null;
              return (
                <li key={`${alert.code}:${alert.target_id}`} className={`bg-alerts__row bg-alerts__row--${alert.severity}`}>
                  <span className={`bg-alerts__dot bg-alerts__dot--${alert.severity}`} aria-hidden="true" />
                  <div className="bg-alerts__text">
                    <span className="bg-alerts__title">{alert.title}</span>
                    <span className="bg-alerts__detail">{alertSentence(lang, alert, currency)}</span>
                  </div>
                  {label ? (
                    <Button size="sm" variant={alert.severity === "critical" ? "primary" : "secondary"} onClick={() => onOpen?.(alert)}>
                      {label}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {total > shown ? <p className="bg-muted bg-alerts__more">{tf(lang, "alerts.more", { n: total - shown })}</p> : null}
        </>
      )}
    </Card>
  );
}
