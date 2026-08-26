/** Credit notes: the corrections ledger.
 *
 *  The backend for this screen has been complete since the credit-note service
 *  landed — list, get, HTML and PDF all exist — and nothing rendered it. This
 *  panel is the missing half.
 *
 *  Creation deliberately lives on the invoice, not here: a credit note always
 *  corrects a specific issued invoice, so starting from a blank form would ask
 *  the user to pick an invoice they have already navigated away from. This
 *  screen is the ledger and the export surface; HistoryPanel is the entry point.
 */

import { useMemo, useState } from "react";

import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  Table,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";

import { useClients, useCreditNotes } from "../hooks/queries";
import { documentFilename, saveBlob } from "../lib/download";
import { formatDate, formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import { useApi } from "../providers/BillGenProvider";
import type { CreditNoteResponse } from "../types";

const PAGE_SIZE = 25;

export interface CreditNotesPanelProps {
  companyId: string;
  lang?: Lang;
  /** Called when the empty state's call to action is used. */
  onGoToInvoices?: () => void;
}

export function CreditNotesPanel({
  companyId,
  lang = "en",
  onGoToInvoices,
}: CreditNotesPanelProps) {
  const api = useApi();
  const { data: creditNotes, isLoading, isError, refetch } = useCreditNotes(companyId);
  const { data: clients } = useClients(companyId);

  const [sort, setSort] = useState<TableSort>({ key: "issue_date", direction: "desc" });
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Client names are a separate resource; index them once rather than scanning
  // the list per row.
  const clientName = useMemo(() => {
    const index = new Map<string, string>();
    for (const client of clients ?? []) index.set(client.id, client.name);
    return (id: string) => index.get(id) ?? "—";
  }, [clients]);

  const sorted = useMemo(() => {
    const rows = [...(creditNotes ?? [])];
    const direction = sort.direction === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const pick = (row: CreditNoteResponse) => {
        switch (sort.key) {
          case "reference":
            return row.reference;
          case "client":
            return clientName(row.client_id);
          case "total_ttc":
            return Number(row.total_ttc);
          default:
            return row.issue_date;
        }
      };
      const left = pick(a);
      const right = pick(b);
      if (left === right) return 0;
      return (left < right ? -1 : 1) * direction;
    });
    return rows;
  }, [creditNotes, sort, clientName]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const download = async (creditNote: CreditNoteResponse) => {
    setDownloading(creditNote.id);
    setFailed(false);
    try {
      const blob = await api.creditNotePdf(creditNote.id);
      await saveBlob(blob, documentFilename(creditNote.reference, "pdf"));
    } catch {
      setFailed(true);
    } finally {
      setDownloading(null);
    }
  };

  const columns: TableColumn<CreditNoteResponse>[] = [
    {
      key: "reference",
      label: t(lang, "history.reference"),
      sortable: true,
      render: (row) => <span className="bg-num">{row.reference}</span>,
    },
    {
      key: "client",
      label: t(lang, "invoice.client"),
      sortable: true,
      render: (row) => clientName(row.client_id),
    },
    {
      key: "issue_date",
      label: t(lang, "history.date"),
      sortable: true,
      render: (row) => formatDate(row.issue_date, lang),
    },
    {
      key: "reason",
      label: t(lang, "creditNotes.reason"),
      render: (row) => row.reason || "—",
    },
    {
      key: "total_ttc",
      label: t(lang, "history.total"),
      numeric: true,
      sortable: true,
      // A credit note reduces what is owed. Showing it as a plain positive
      // number next to invoice totals reads as extra revenue, so it carries an
      // explicit minus and the danger tone.
      render: (row) => (
        <span className="bg-num">
          −{formatMoney(row.total_ttc, row.currency, lang)}
        </span>
      ),
    },
    {
      key: "status",
      label: t(lang, "history.status"),
      render: () => <Badge tone="danger">{t(lang, "history.creditNote")}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={downloading === row.id}
          onClick={() => void download(row)}
        >
          {t(lang, "history.downloadPdf")}
        </Button>
      ),
    },
  ];

  if (isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => void refetch()}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card padded={false}>
        <div className="bg-report__skeleton">
          <Skeleton lines={6} />
        </div>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t(lang, "creditNotes.empty")}
          description={t(lang, "creditNotes.emptyHint")}
          action={
            onGoToInvoices ? (
              <Button onClick={onGoToInvoices}>
                {t(lang, "creditNotes.goToInvoices")}
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      {failed ? (
        <Banner tone="danger" onDismiss={() => setFailed(false)}>
          {t(lang, "history.downloadError")}
        </Banner>
      ) : null}

      <Table
        columns={columns}
        rows={visible}
        rowKey={(row) => row.id}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
      />

      {pageCount > 1 ? (
        <div className="bg-report__pagination">
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      ) : null}
    </Card>
  );
}
