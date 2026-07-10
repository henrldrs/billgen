import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { PageHeader } from "../../../components/PageHeader";
import { Section, type GalleryProps } from "../ui";

export function LayoutGallery({ onAction }: GalleryProps) {
  return (
    <>
      <Section title="PageHeader — title + subtitle + primary action">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <PageHeader
            title="Invoices"
            subtitle="12 open · 3 overdue"
            actions={
              <Button onClick={() => onAction("PageHeader 'New invoice' clicked")}>New invoice</Button>
            }
          />
          <PageHeader
            title="Invoice 2026-0042"
            subtitle="Draft — not yet issued"
            onBack={() => onAction("PageHeader back clicked")}
            actions={
              <>
                <Button variant="secondary" onClick={() => onAction("PageHeader 'Preview PDF' clicked")}>
                  Preview PDF
                </Button>
                <Button onClick={() => onAction("PageHeader 'Issue' clicked")}>Issue</Button>
              </>
            }
          />
        </div>
      </Section>

      <Section title="Card — plain body">
        <Card>Just content — no header, no footer. The base unit of most layouts.</Card>
      </Section>

      <Section title="Card — header, actions, footer">
        <Card
          title="Client details"
          subtitle="Everything BillGen knows about this client"
          actions={
            <Button variant="outline" size="sm" onClick={() => onAction("Card 'Edit' clicked")}>
              Edit
            </Button>
          }
          footer="Last updated 2 days ago"
        >
          <p style={{ margin: 0 }}>
            Acme Consulting BV · BE 0123.456.789 · Rue de la Loi 1, 1000 Bruxelles
          </p>
        </Card>
      </Section>

      <Section title="Card — flush body (padded=false, for tables/lists) + .bg-num for IDs/amounts">
        <Card title="Recent invoices" padded={false}>
          {[
            { id: "2026-0042", client: "Acme Consulting", amount: "€ 1 210,00" },
            { id: "2026-0041", client: "Other Co.", amount: "€ 847,00" },
            { id: "2026-0040", client: "Acme Consulting", amount: "€ 2 662,00" },
          ].map((row) => (
            <div
              key={row.id}
              style={{
                display: "flex",
                gap: "1rem",
                padding: "0.7rem 1.25rem",
                borderBottom: "1px solid var(--bg-line)",
                fontSize: "0.9rem",
              }}
            >
              <span className="bg-num">{row.id}</span>
              <span style={{ flex: 1 }}>{row.client}</span>
              <span className="bg-num">{row.amount}</span>
            </div>
          ))}
        </Card>
      </Section>
    </>
  );
}
