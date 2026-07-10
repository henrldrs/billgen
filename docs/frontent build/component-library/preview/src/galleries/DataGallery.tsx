import { useState } from "react";
import { Table, type TableColumn, type TableSort } from "../../../components/Table";
import { List } from "../../../components/List";
import { Badge, type InvoiceStatus } from "../../../components/Badge";
import { Tooltip } from "../../../components/Tooltip";
import { Skeleton } from "../../../components/Skeleton";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { IconButton } from "../../../components/IconButton";
import { IconChip, SettingsUserIcon, CompanyIcon, HelpIcon } from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

interface InvoiceRow {
  id: string;
  client: string;
  issued: string;
  status: InvoiceStatus;
  total: number;
}

const INVOICES: InvoiceRow[] = [
  { id: "2026-0038", client: "Acme Consulting BV", issued: "2026-06-02", status: "paid", total: 1815.0 },
  { id: "2026-0039", client: "Blauwhuis NV", issued: "2026-06-11", status: "partially_paid", total: 4235.5 },
  { id: "2026-0040", client: "Cactus & Co", issued: "2026-06-18", status: "issued", total: 726.0 },
  { id: "2026-0041", client: "De Wilde Advocaten", issued: "2026-06-25", status: "voided", total: 302.5 },
  { id: "2026-0042", client: "Elysia Studio", issued: "2026-07-01", status: "draft", total: 968.0 },
];

const euro = (n: number) =>
  n.toLocaleString("nl-BE", { style: "currency", currency: "EUR" });

export function DataGallery({ onAction }: GalleryProps) {
  const [sort, setSort] = useState<TableSort>({ key: "issued", direction: "asc" });
  const [loading, setLoading] = useState(true);

  const columns: TableColumn<InvoiceRow>[] = [
    { key: "id", label: "Invoice", sortable: true, render: (r) => <span className="bg-num">{r.id}</span> },
    { key: "client", label: "Client", sortable: true },
    { key: "issued", label: "Issued", sortable: true, render: (r) => <span className="bg-num">{r.issued}</span> },
    { key: "status", label: "Status", render: (r) => <Badge status={r.status} /> },
    { key: "total", label: "Total", numeric: true, sortable: true, render: (r) => euro(r.total) },
  ];

  const sortedRows = [...INVOICES].sort((a, b) => {
    const va = a[sort.key as keyof InvoiceRow];
    const vb = b[sort.key as keyof InvoiceRow];
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sort.direction === "asc" ? cmp : -cmp;
  });

  return (
    <>
      <Section title="Table — sortable headers, mono numerics, clickable rows">
        <Card title="Invoices" subtitle="Click a header to sort, a row to open.">
          <Table
            columns={columns}
            rows={sortedRows}
            rowKey={(r) => r.id}
            sort={sort}
            onSortChange={(next) => {
              setSort(next);
              onAction(`Table sorted by ${next.key} (${next.direction})`);
            }}
            onRowClick={(r) => onAction(`Table row opened: invoice ${r.id}`)}
            empty="No invoices yet."
          />
        </Card>
      </Section>

      <Section title="List — leading chip, two-line text, trailing slot">
        <Card title="Clients">
          <List
            items={[
              {
                key: "acme",
                leading: (
                  <IconChip tone="accent" size="md">
                    <SettingsUserIcon />
                  </IconChip>
                ),
                primary: "Acme Consulting BV",
                secondary: <span className="bg-num">BE 0123.456.789</span>,
                trailing: <span className="bg-num">{euro(12705.5)}</span>,
                onClick: () => onAction("List: Acme Consulting opened"),
              },
              {
                key: "blauwhuis",
                leading: (
                  <IconChip tone="navy" size="md">
                    <CompanyIcon />
                  </IconChip>
                ),
                primary: "Blauwhuis NV",
                secondary: <span className="bg-num">BE 0987.654.321</span>,
                trailing: <Badge tone="warn">2 overdue</Badge>,
                onClick: () => onAction("List: Blauwhuis opened"),
              },
              {
                key: "cactus",
                leading: (
                  <IconChip tone="neutral" size="md">
                    <CompanyIcon />
                  </IconChip>
                ),
                primary: "Cactus & Co",
                secondary: "No VAT number on file",
                trailing: <Badge tone="neutral">prospect</Badge>,
              },
            ]}
          />
        </Card>
      </Section>

      <Section title="Badge — the five invoice statuses + generic tones">
        <Row>
          <Badge status="draft" />
          <Badge status="issued" />
          <Badge status="paid" />
          <Badge status="partially_paid" />
          <Badge status="voided" />
        </Row>
        <div style={{ height: "0.9rem" }} />
        <Row>
          <Badge tone="neutral">tag</Badge>
          <Badge tone="info">peppol</Badge>
          <Badge tone="success">synced</Badge>
          <Badge tone="warn">2 overdue</Badge>
          <Badge tone="danger">blocked</Badge>
        </Row>
      </Section>

      <Section title="Tooltip — hover or keyboard-focus (150ms intent delay)">
        <Row>
          <Tooltip label="Send this invoice through the Peppol network.">
            <Button variant="secondary" onClick={() => onAction("Tooltip'd button clicked")}>
              Send via Peppol
            </Button>
          </Tooltip>
          <Tooltip label="Structured communication — Belgian payment reference." side="bottom">
            <span className="bg-num" style={{ textDecoration: "underline dotted", cursor: "help" }}>
              +++123/4567/89012+++
            </span>
          </Tooltip>
          <Tooltip label="Help lives here." side="right">
            <IconButton aria-label="Help" onClick={() => onAction("Help icon clicked")}>
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Row>
      </Section>

      <Section title="Skeleton — text lines, block, circle (toggle to compare)">
        <Row>
          <Button variant="secondary" size="sm" onClick={() => setLoading((v) => !v)}>
            {loading ? "show loaded state" : "show skeleton"}
          </Button>
        </Row>
        <div style={{ height: "0.9rem" }} />
        <Card title={loading ? undefined : "Elysia Studio"} subtitle={loading ? undefined : "Client since 2025"}>
          {loading ? (
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <Skeleton variant="circle" />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" lines={3} />
                <div style={{ height: "1rem" }} />
                <Skeleton variant="block" height="4.5rem" />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <IconChip tone="accent" size="md">
                <SettingsUserIcon />
              </IconChip>
              <div style={{ flex: 1, fontSize: "var(--bg-text-body)" }}>
                <p style={{ margin: 0 }}>
                  Last invoice <span className="bg-num">2026-0042</span> is still a draft. Outstanding
                  balance <span className="bg-num">{euro(968.0)}</span>.
                </p>
              </div>
            </div>
          )}
        </Card>
        <Label>Shimmer slows down under prefers-reduced-motion.</Label>
      </Section>
    </>
  );
}
