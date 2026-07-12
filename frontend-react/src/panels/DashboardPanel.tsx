import { Spinner } from "@henrioutai/ui";
import { useKpi, useRevenue } from "../hooks/queries";
import { formatMoney, monthName } from "../lib/format";
import { t, type Lang } from "../lib/translations";

export interface DashboardPanelProps {
  companyId: string;
  lang?: Lang;
  year?: number;
  /** ISO date used as "today" for overdue computation — mainly for tests. */
  today?: string;
}

export function DashboardPanel({
  companyId,
  lang = "en",
  year = new Date().getFullYear(),
  today,
}: DashboardPanelProps) {
  const kpi = useKpi(companyId, today);
  const revenue = useRevenue(companyId, year);

  if (kpi.isLoading || revenue.isLoading) {
    return <Spinner label={t(lang, "common.loading")} />;
  }
  if (kpi.isError || revenue.isError) {
    return <div role="alert">{t(lang, "common.error")}</div>;
  }

  const months = Object.entries(revenue.data?.months ?? {}).sort(
    ([a], [b]) => Number(a) - Number(b),
  );

  return (
    <section className="bg-panel" aria-label={t(lang, "dashboard.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "dashboard.title")}</h1>
      </header>

      <div className="bg-kpi-grid">
        <div className="bg-kpi-card">
          <div className="bg-kpi-card__label">{t(lang, "dashboard.invoiced")}</div>
          <div className="bg-kpi-card__value">
            {formatMoney(kpi.data?.invoiced_total ?? 0, "EUR", lang)}
          </div>
        </div>
        <div className="bg-kpi-card">
          <div className="bg-kpi-card__label">{t(lang, "dashboard.paid")}</div>
          <div className="bg-kpi-card__value">
            {formatMoney(kpi.data?.paid_total ?? 0, "EUR", lang)}
          </div>
        </div>
        <div className="bg-kpi-card">
          <div className="bg-kpi-card__label">{t(lang, "dashboard.outstanding")}</div>
          <div className="bg-kpi-card__value">
            {formatMoney(kpi.data?.outstanding_total ?? 0, "EUR", lang)}
          </div>
        </div>
        <div className="bg-kpi-card">
          <div className="bg-kpi-card__label">{t(lang, "dashboard.overdue")}</div>
          <div className="bg-kpi-card__value">{kpi.data?.overdue_count ?? 0}</div>
        </div>
      </div>

      <h2>
        {t(lang, "dashboard.revenue")} — {year}
      </h2>
      {months.length > 0 ? (
        <table className="bg-table">
          <thead>
            <tr>
              <th>{t(lang, "dashboard.month")}</th>
              <th>{t(lang, "dashboard.invoiced")}</th>
            </tr>
          </thead>
          <tbody>
            {months.map(([month, total]) => (
              <tr key={month}>
                <td>{monthName(Number(month), lang)}</td>
                <td>{formatMoney(total, "EUR", lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
