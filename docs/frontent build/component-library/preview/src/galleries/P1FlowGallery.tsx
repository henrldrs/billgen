import { useEffect, useState } from "react";
import { Drawer } from "../../../components/Drawer";
import { Stepper } from "../../../components/Stepper";
import { StatusTimeline } from "../../../components/StatusTimeline";
import { CommandPalette } from "../../../components/CommandPalette";
import { Button } from "../../../components/Button";
import { Badge } from "../../../components/Badge";
import { List } from "../../../components/List";
import {
  DashboardIcon,
  SettingsUserIcon,
  PolicyIcon,
  PlusIcon,
  CompanyIcon,
} from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

const WIZARD_STEPS = [
  { key: "client", label: "Client", description: "who gets it" },
  { key: "lines", label: "Lines", description: "what's on it" },
  { key: "review", label: "Review", description: "totals & VAT" },
  { key: "send", label: "Send", description: "PDF or Peppol" },
];

export function P1FlowGallery({ onAction }: GalleryProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<"right" | "left">("right");
  const [step, setStep] = useState("review");
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* Real apps bind this globally too — the palette itself stays controlled. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.key === step);

  return (
    <>
      <Section title="Drawer — slide-in detail panel (Esc / backdrop / × close)">
        <Row>
          <Button
            variant="secondary"
            onClick={() => {
              setDrawerSide("right");
              setDrawerOpen(true);
            }}
          >
            Open right drawer
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setDrawerSide("left");
              setDrawerOpen(true);
            }}
          >
            left side
          </Button>
        </Row>
        <Drawer
          open={drawerOpen}
          side={drawerSide}
          onClose={() => {
            setDrawerOpen(false);
            onAction("Drawer closed");
          }}
          title={
            <>
              Invoice <span className="bg-num">2026-0039</span>
            </>
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setDrawerOpen(false);
                  onAction("Drawer: Record payment clicked");
                }}
              >
                Record payment
              </Button>
            </>
          }
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
            <Badge status="partially_paid" />
            <span className="bg-num" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              € 4.235,50
            </span>
          </div>
          <StatusTimeline
            items={[
              { key: "created", label: "Created", timestamp: "02/06 09:14", status: "done" },
              { key: "issued", label: "Issued", timestamp: "11/06 08:00", status: "done" },
              { key: "partial", label: "Partial payment", description: "€ 2.000,00 received", timestamp: "28/06 14:32", status: "done" },
              { key: "settled", label: "Settled", status: "current" },
            ]}
          />
        </Drawer>
      </Section>

      <Section title="Stepper — wizard trail, completed steps clickable">
        <Stepper
          steps={WIZARD_STEPS}
          activeKey={step}
          onStepClick={(key) => {
            setStep(key);
            onAction(`Stepper: back to ${key}`);
          }}
        />
        <div style={{ marginTop: "1rem" }}>
          <Row>
            <Button
              variant="secondary"
              size="sm"
              disabled={stepIndex <= 0}
              onClick={() => setStep(WIZARD_STEPS[stepIndex - 1].key)}
            >
              back
            </Button>
            <Button
              size="sm"
              disabled={stepIndex >= WIZARD_STEPS.length - 1}
              onClick={() => setStep(WIZARD_STEPS[stepIndex + 1].key)}
            >
              next step
            </Button>
          </Row>
        </div>
      </Section>

      <Section title="StatusTimeline — Peppol delivery (current pulses, failed stops the line)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2rem", maxWidth: 700 }}>
          <StatusTimeline
            items={[
              { key: "c", label: "Created", timestamp: "01/07 10:02", status: "done" },
              { key: "v", label: "Validated", description: "EN 16931 schema OK", timestamp: "01/07 10:02", status: "done" },
              { key: "s", label: "Sent to access point", timestamp: "01/07 10:03", status: "current" },
              { key: "d", label: "Delivered", status: "upcoming" },
            ]}
          />
          <StatusTimeline
            items={[
              { key: "c", label: "Created", timestamp: "30/06 16:45", status: "done" },
              { key: "v", label: "Validation failed", description: "Buyer VAT number malformed.", timestamp: "30/06 16:45", status: "failed" },
              { key: "s", label: "Sent to access point", status: "upcoming" },
              { key: "d", label: "Delivered", status: "upcoming" },
            ]}
          />
        </div>
      </Section>

      <Section title="Command palette — Ctrl/⌘ K anywhere in this preview, or:">
        <Row>
          <Button variant="secondary" onClick={() => setPaletteOpen(true)}>
            Open palette
          </Button>
        </Row>
        <Label>Type to filter across sections; ↑↓ + ↵ runs; Esc closes.</Label>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          commands={[
            { key: "new-invoice", label: "New invoice", icon: <PlusIcon />, hint: "N", section: "Create", onRun: () => onAction("Palette: New invoice") },
            { key: "new-client", label: "New client", icon: <SettingsUserIcon />, section: "Create", onRun: () => onAction("Palette: New client") },
            { key: "go-dashboard", label: "Go to Dashboard", icon: <DashboardIcon />, section: "Navigate", onRun: () => onAction("Palette: Dashboard") },
            { key: "go-invoices", label: "Go to Invoices", icon: <PolicyIcon />, section: "Navigate", keywords: "list bills", onRun: () => onAction("Palette: Invoices") },
            { key: "go-company", label: "Company details", icon: <CompanyIcon />, section: "Navigate", keywords: "settings", onRun: () => onAction("Palette: Company details") },
          ]}
        />
      </Section>

      <Section title="Where these meet — a drawer is a List away">
        <List
          items={[
            {
              key: "0039",
              primary: "Blauwhuis NV",
              secondary: <span className="bg-num">2026-0039 · € 4.235,50</span>,
              trailing: <Badge status="partially_paid" />,
              onClick: () => {
                setDrawerSide("right");
                setDrawerOpen(true);
                onAction("List row → Drawer opened");
              },
            },
          ]}
        />
      </Section>
    </>
  );
}
