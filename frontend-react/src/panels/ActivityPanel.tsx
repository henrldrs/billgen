import { EmptyState } from "../components/EmptyState";
import { Spinner } from "../components/Spinner";
import { useActivity } from "../hooks/queries";
import { t, type Lang } from "../lib/translations";

export interface ActivityPanelProps {
  lang?: Lang;
  limit?: number;
  targetType?: string;
}

export function ActivityPanel({ lang = "en", limit = 50, targetType }: ActivityPanelProps) {
  const { data: entries, isLoading, isError } = useActivity({ limit, targetType });

  if (isLoading) return <Spinner label={t(lang, "common.loading")} />;
  if (isError) return <div role="alert">{t(lang, "common.error")}</div>;

  return (
    <section className="bg-panel" aria-label={t(lang, "activity.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "activity.title")}</h1>
      </header>

      {entries && entries.length > 0 ? (
        <ul className="bg-activity">
          {entries.map((entry) => (
            <li key={entry.id} className="bg-activity__entry">
              <span className={`bg-badge bg-badge--${entry.action}`}>{entry.action}</span>{" "}
              <span className="bg-activity__target">{entry.target_type}</span>{" "}
              <time dateTime={entry.timestamp}>
                {new Date(entry.timestamp).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t(lang, "activity.empty")} />
      )}
    </section>
  );
}
