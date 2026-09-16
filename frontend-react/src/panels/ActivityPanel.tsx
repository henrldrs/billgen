/** The audit log, read whole or scoped to one kind of record.
 *
 *  `targetType` is the only filter the server offers (GET /activity takes
 *  target_type, target_id and limit — nothing else), so this panel exposes no
 *  actor filter, no date range and no free-text search: those would each have
 *  to be a client-side illusion over a truncated `limit` window. They are
 *  logged as gaps on activity.user and explore.activity in scaffold/ia.ts.
 */

import { useMemo, useState } from "react";

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
  Table,
  type TableColumn,
} from "@henrioutai/ui";

import { useActivity } from "../hooks/queries";
import { t, tAuditAction, tEntity, type Lang } from "../lib/translations";
import type { ActivityEntryResponse } from "../types";

const PAGE_SIZE = 25;

export interface ActivityPanelProps {
  lang?: Lang;
  limit?: number;
  /** Scope to one kind of record ("client", "invoice", "product"). */
  targetType?: string;
  /** Page title. Defaults to the generic audit-log heading. */
  title?: string;
  /** One line under the title explaining what this slice of the log is. */
  hint?: string;
}

export function ActivityPanel({
  lang = "en",
  limit = 50,
  targetType,
  title,
  hint,
}: ActivityPanelProps) {
  const { data: entries, isLoading, isError, refetch } = useActivity({ limit, targetType });
  const [page, setPage] = useState(1);

  // The API already returns newest-first; this panel does not reorder it,
  // because "most recent first" is the only reading an audit log has.
  const rows = useMemo(() => entries ?? [], [entries]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<ActivityEntryResponse>[] = [
    {
      key: "action",
      label: t(lang, "activity.action"),
      render: (entry) => <Badge tone="info">{tAuditAction(lang, entry.action)}</Badge>,
    },
    {
      key: "target_type",
      label: t(lang, "activity.target"),
      // The wire says `document_template`; a person reads a word (T-46).
      render: (entry) => tEntity(lang, entry.target_type),
    },
    {
      key: "timestamp",
      label: t(lang, "activity.when"),
      render: (entry) => (
        <time dateTime={entry.timestamp}>
          {new Date(entry.timestamp).toLocaleString()}
        </time>
      ),
    },
  ];

  return (
    <section className="bg-stack" aria-label={title ?? t(lang, "activity.title")}>
      <PageHeader title={title ?? t(lang, "activity.title")} subtitle={hint} />

      <Card padded={false}>
        {isError ? (
          <div className="bg-report__skeleton">
            <ErrorState
              title={t(lang, "common.error")}
              onRetry={() => void refetch()}
              retryLabel={t(lang, "common.retry")}
            />
          </div>
        ) : isLoading ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={6} />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              rows={visible}
              rowKey={(entry) => entry.id}
              empty={<EmptyState title={t(lang, "activity.empty")} />}
            />
            {pageCount > 1 ? (
              <div className="bg-report__pagination">
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </Card>
    </section>
  );
}
