import { useState } from "react";
import { ContextMenu } from "../../../components/ContextMenu";
import { OrgSwitcher } from "../../../components/OrgSwitcher";
import { HelpBubble } from "../../../components/HelpBubble";
import { ChartWrapper } from "../../../components/ChartWrapper";
import { Divider } from "../../../components/Divider";
import { Segmented } from "../../../components/Segmented";
import { List } from "../../../components/List";
import { Badge } from "../../../components/Badge";
import { PolicyIcon, PlusIcon } from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

/* Hand-drawn demo bars — stands in for whatever chart lib the dashboard picks. */
const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const ISSUED = [42, 58, 51, 74, 66, 89];
const PAID = [35, 50, 48, 60, 61, 70];

function DemoBars() {
  const max = 100;
  const bw = 100 / MONTHS.length;
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label="Issued vs paid per month">
      {MONTHS.map((_, i) => {
        const x = i * bw;
        return (
          <g key={i}>
            <rect x={x + bw * 0.18} y={60 - (ISSUED[i] / max) * 56} width={bw * 0.28} height={(ISSUED[i] / max) * 56} rx="1" fill="var(--bg-accent)" opacity="0.9" />
            <rect x={x + bw * 0.52} y={60 - (PAID[i] / max) * 56} width={bw * 0.28} height={(PAID[i] / max) * 56} rx="1" fill="var(--bg-navy)" opacity="0.55" />
          </g>
        );
      })}
    </svg>
  );
}

export function P1ClosersGallery({ onAction }: GalleryProps) {
  const [org, setOrg] = useState("henrioutai");
  const [range, setRange] = useState("6m");
  const [chartState, setChartState] = useState("data");

  return (
    <>
      <Section title="ContextMenu — right-click the invoice row (same entries as Menu)">
        <ContextMenu
          items={[
            { key: "open", label: "Open", icon: <PolicyIcon />, onSelect: () => onAction("ContextMenu: Open") },
            { key: "duplicate", label: "Duplicate", icon: <PlusIcon />, onSelect: () => onAction("ContextMenu: Duplicate") },
            { type: "separator", key: "sep" },
            { key: "void", label: "Void invoice", danger: true, onSelect: () => onAction("ContextMenu: Void") },
          ]}
        >
          <List
            items={[
              {
                key: "0040",
                primary: "Cactus & Co",
                secondary: <span className="bg-num">2026-0040 · € 726,00</span>,
                trailing: <Badge status="issued" />,
                onClick: () => onAction("Row left-clicked (context menu is on RIGHT click)"),
              },
            ]}
          />
        </ContextMenu>
        <Label>Left click keeps its normal action; the popup clamps to the viewport near edges.</Label>
      </Section>

      <Section title="OrgSwitcher — the company switcher, now a real component (also swapped into the TopNav demo)">
        <Row>
          <OrgSwitcher
            orgs={[
              { key: "henrioutai", name: "Henrioutai BV", detail: "BE 0123.456.789" },
              { key: "side", name: "Side Studio", detail: "BE 0456.789.123" },
            ]}
            activeKey={org}
            onChange={(key) => {
              setOrg(key);
              onAction(`OrgSwitcher: ${key}`);
            }}
            onCreateNew={() => onAction("OrgSwitcher: new company")}
          />
        </Row>
      </Section>

      <Section title="ChartWrapper — one frame for every chart (lib-agnostic)">
        <div style={{ maxWidth: 560 }}>
          <ChartWrapper
            title="Invoiced vs. paid"
            subtitle="last six months, € (thousands)"
            legend={[
              { key: "issued", label: "Issued", color: "var(--bg-accent)" },
              { key: "paid", label: "Paid", color: "var(--bg-navy)" },
            ]}
            actions={
              <Segmented
                ariaLabel="Range"
                size="sm"
                value={range}
                onChange={(v) => {
                  setRange(v);
                  onAction(`ChartWrapper range: ${v}`);
                }}
                options={[
                  { value: "6m", label: "6M" },
                  { value: "12m", label: "12M" },
                ]}
              />
            }
            caption="Demo bars are hand-drawn SVG — the wrapper doesn't care what draws the plot."
            loading={chartState === "loading"}
            empty={chartState === "empty" ? "No invoices in this period yet." : undefined}
            height={180}
          >
            <DemoBars />
          </ChartWrapper>
          <div style={{ marginTop: "0.75rem" }}>
            <Segmented
              ariaLabel="Chart demo state"
              size="sm"
              value={chartState}
              onChange={setChartState}
              options={[
                { value: "data", label: "data" },
                { value: "loading", label: "loading" },
                { value: "empty", label: "empty" },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Divider — plain, labeled start, labeled center">
        <div style={{ maxWidth: 560 }}>
          <p style={{ margin: 0, fontSize: "var(--bg-text-body)" }}>Invoices from July…</p>
          <Divider />
          <p style={{ margin: 0, fontSize: "var(--bg-text-body)" }}>…then a plain break, or grouped by month:</p>
          <Divider label="June 2026" />
          <p style={{ margin: 0, fontSize: "var(--bg-text-body)" }}>June's rows…</p>
          <Divider label="Archived" align="center" />
          <p style={{ margin: 0, fontSize: "var(--bg-text-body)" }}>…and the old stuff.</p>
        </div>
      </Section>

      <Section title="HelpBubble — floating launcher, bottom-LEFT (toasts own bottom-right)">
        <Label>
          It's fixed-position — look at the bottom-left corner of this page. Mounted once here in
          the gallery the way an app shell would.
        </Label>
        <HelpBubble
          title="Need a hand?"
          links={[
            { key: "docs", label: "Getting started guide", hint: "2 min", onSelect: () => onAction("Help: guide") },
            { key: "peppol", label: "What is Peppol?", onSelect: () => onAction("Help: peppol") },
            { key: "mail", label: "Email support", hint: "opens mail", onSelect: () => onAction("Help: email") },
          ]}
        >
          Answers for the common bumps — invoicing basics, Peppol, VAT.
        </HelpBubble>
      </Section>
    </>
  );
}
