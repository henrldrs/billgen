import { useState } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Tabs } from "../../../components/Tabs";
import { Pagination } from "../../../components/Pagination";
import { KpiCard } from "../../../components/KpiCard";
import { Avatar } from "../../../components/Avatar";
import { IconChip, DashboardIcon, PolicyIcon, CompanyIcon, UpgradeIcon } from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

export function P1NavDataGallery({ onAction }: GalleryProps) {
  const [tab, setTab] = useState("overview");
  const [page, setPage] = useState(6);

  return (
    <>
      <Section title="Breadcrumbs — ancestors clickable, current page inert">
        <Breadcrumbs
          items={[
            { key: "dash", label: "Dashboard", onClick: () => onAction("Breadcrumb: Dashboard") },
            { key: "clients", label: "Clients", onClick: () => onAction("Breadcrumb: Clients") },
            { key: "acme", label: "Acme Consulting BV" },
          ]}
        />
      </Section>

      <Section title="Tabs — underline switcher (Left/Right/Home/End move + select)">
        <Tabs
          items={[
            { key: "overview", label: "Overview", icon: <DashboardIcon /> },
            { key: "invoices", label: "Invoices", icon: <PolicyIcon />, count: 12 },
            { key: "payments", label: "Payments", count: 3 },
            { key: "peppol", label: "Peppol", disabled: true },
          ]}
          activeKey={tab}
          onChange={(key) => {
            setTab(key);
            onAction(`Tab selected: ${key}`);
          }}
        />
        <p style={{ fontSize: "var(--bg-text-helper)", color: "var(--bg-ink-soft)" }}>
          (panel for "{tab}" would render here — panels are the caller's job)
        </p>
      </Section>

      <Section title="Pagination — windowed numbers, mono digits">
        <Row>
          <Pagination
            page={page}
            pageCount={12}
            onPageChange={(p) => {
              setPage(p);
              onAction(`Pagination: page ${p}`);
            }}
          />
        </Row>
        <Label>12 pages, sibling window of 1 — single hidden pages render as the number, not "…".</Label>
      </Section>

      <Section title="KpiCard — metric + trend (data surface: no glass, 2–4% sheen)">
        <div className="bg-kpi-grid">
          <KpiCard
            label="Revenue this month"
            value={<span>€ 12.705,50</span>}
            delta={{ value: "+12,4 %", direction: "up" }}
            hint="vs. June"
            icon={
              <IconChip tone="accent" size="md">
                <UpgradeIcon />
              </IconChip>
            }
          />
          <KpiCard
            label="Outstanding"
            value={<span>€ 4.235,50</span>}
            delta={{ value: "+2", direction: "up", positiveIsGood: false }}
            hint="2 invoices awaiting payment"
          />
          <KpiCard
            label="Overdue"
            value="1"
            delta={{ value: "−3", direction: "down", positiveIsGood: false }}
            hint="reminders sent"
          />
          <KpiCard
            label="Drafts"
            value="2"
            delta={{ value: "±0", direction: "flat" }}
            icon={
              <IconChip tone="neutral" size="md">
                <CompanyIcon />
              </IconChip>
            }
          />
        </div>
        <Label>Values render in Geist Mono tabular figures automatically (base rule on .bg-kpi-card__value).</Label>
      </Section>

      <Section title="Avatar — initials from name, image when available">
        <Row>
          <Avatar name="Henri B." size="sm" />
          <Avatar name="Henri B." size="md" />
          <Avatar name="Henri B." size="lg" />
          <Avatar name="Acme Consulting" tone="navy" />
          <Avatar name="Cactus & Co" tone="neutral" />
        </Row>
        <Label>
          Non-interactive by design — wrap it in a Menu trigger or button when it needs to act
          (AccountMenu does exactly that).
        </Label>
      </Section>
    </>
  );
}
