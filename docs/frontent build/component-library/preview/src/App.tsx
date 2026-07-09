import { useState } from "react";
import { LogoMark } from "../../components/LogoMark";
import { HomeButton } from "../../components/HomeButton";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { CreateBillButton } from "../../components/CreateBillButton";
import { TopNav, type TopNavLink } from "../../components/TopNav";
import { LoadingScreen } from "../../components/LoadingScreen";
import {
  IconChip,
  DashboardIcon,
  SettingsUserIcon,
  HelpIcon,
  PolicyIcon,
  SupportIcon,
  BackIcon,
  ForwardIcon,
  CompanyIcon,
  UpgradeIcon,
  NotificationsIcon,
  LanguageIcon,
  SearchIcon,
  PlusIcon,
} from "../../components/icons";

const ICONS = [
  { name: "DashboardIcon", Icon: DashboardIcon },
  { name: "SettingsUserIcon", Icon: SettingsUserIcon },
  { name: "HelpIcon", Icon: HelpIcon },
  { name: "PolicyIcon", Icon: PolicyIcon },
  { name: "SupportIcon", Icon: SupportIcon },
  { name: "BackIcon", Icon: BackIcon },
  { name: "ForwardIcon", Icon: ForwardIcon },
  { name: "CompanyIcon", Icon: CompanyIcon },
  { name: "UpgradeIcon", Icon: UpgradeIcon },
  { name: "NotificationsIcon", Icon: NotificationsIcon },
  { name: "LanguageIcon", Icon: LanguageIcon },
  { name: "SearchIcon", Icon: SearchIcon },
  { name: "PlusIcon", Icon: PlusIcon },
];

const VARIANTS = ["primary", "secondary", "danger", "outline", "ghost", "link", "plain"] as const;
const SIZES = ["sm", "md", "lg", "xl"] as const;

const SAMPLE_LINKS: TopNavLink[] = [
  { key: "dashboard", label: "Dashboard", icon: <DashboardIcon />, active: true },
  { key: "clients", label: "Clients", icon: <SettingsUserIcon /> },
  { key: "products", label: "Products & services", icon: <CompanyIcon /> },
  { key: "invoices-new", label: "New invoice", icon: <PlusIcon /> },
  { key: "invoices", label: "Invoices", icon: <PolicyIcon /> },
  { key: "activity", label: "Activity log", icon: <SupportIcon /> },
  { key: "import", label: "Import data", icon: <UpgradeIcon /> },
  { key: "settings", label: "Company details", icon: <HelpIcon /> },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.1rem", borderBottom: "2px solid var(--bg-ink)", paddingBottom: "0.4rem" }}>
        {title}
      </h2>
      <div style={{ marginTop: "1.25rem" }}>{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.25rem" }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "0.75rem", color: "var(--bg-ink-soft)", marginTop: "0.35rem" }}>{children}</div>;
}

export function App() {
  const [lastAction, setLastAction] = useState("(none yet — click / hover things below)");
  const [links, setLinks] = useState(SAMPLE_LINKS);

  const act = (msg: string) => () => setLastAction(msg);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Component Library Preview</h1>
      <p style={{ color: "var(--bg-ink-soft)", marginTop: 0 }}>
        Isolated build — nothing here is wired into frontend-react/frontend-saas.
      </p>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-line)",
          borderRadius: "var(--bg-radius)",
          padding: "0.6rem 1rem",
          marginBottom: "2rem",
          fontSize: "0.85rem",
        }}
      >
        <strong>Last action:</strong> {lastAction}
      </div>

      <Section title="LogoMark">
        <Row>
          {[20, 32, 48, 72].map((size) => (
            <div key={size} style={{ textAlign: "center" }}>
              <LogoMark size={size} />
              <Label>{size}px</Label>
            </div>
          ))}
        </Row>
      </Section>

      <Section title="HomeButton (click it, hover it)">
        <Row>
          {(["sm", "md", "lg"] as const).map((size) => (
            <div key={size} style={{ textAlign: "center" }}>
              <HomeButton size={size} onNavigateHome={act(`HomeButton (${size}) clicked`)} />
              <Label>{size}</Label>
            </div>
          ))}
        </Row>
      </Section>

      <Section title="IconChip — tone x size">
        <Row>
          {(["neutral", "accent", "navy"] as const).map((tone) =>
            (["sm", "md", "lg"] as const).map((size) => (
              <div key={`${tone}-${size}`} style={{ textAlign: "center" }}>
                <IconChip tone={tone} size={size}>
                  <SettingsUserIcon />
                </IconChip>
                <Label>
                  {tone} / {size}
                </Label>
              </div>
            )),
          )}
        </Row>
      </Section>

      <Section title="Icon set (retokenized from docs/SVG icon .txt)">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: "1rem",
          }}
        >
          {ICONS.map(({ name, Icon }) => (
            <div key={name} style={{ textAlign: "center" }}>
              <IconChip tone="neutral" size="md">
                <Icon />
              </IconChip>
              <Label>{name}</Label>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button — variants">
        <Row>
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} onClick={act(`Button variant="${variant}" clicked`)}>
              {variant}
            </Button>
          ))}
        </Row>
      </Section>

      <Section title="Button — sizes (primary)">
        <Row>
          {SIZES.map((size) => (
            <Button key={size} size={size} onClick={act(`Button size="${size}" clicked`)}>
              {size}
            </Button>
          ))}
        </Row>
      </Section>

      <Section title="IconButton">
        <Row>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Search" onClick={act("IconButton search clicked")}>
              <SearchIcon />
            </IconButton>
            <Label>no dot</Label>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Notifications" dot onClick={act("IconButton notifications clicked")}>
              <NotificationsIcon />
            </IconButton>
            <Label>with dot</Label>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Back" tone="navy" onClick={act("IconButton back clicked")}>
              <BackIcon />
            </IconButton>
            <Label>navy tone</Label>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Forward" tone="accent" onClick={act("IconButton forward clicked")}>
              <ForwardIcon />
            </IconButton>
            <Label>accent tone</Label>
          </div>
        </Row>
      </Section>

      <Section title="CreateBillButton — hover to grow, click to shine">
        <Row>
          <CreateBillButton onClick={act("CreateBillButton clicked (shine should play)")} />
        </Row>
      </Section>

      <Section title="TopNav — assembled, links replace a sidebar">
        <div style={{ border: "1px solid var(--bg-line)", borderRadius: "var(--bg-radius)", overflow: "hidden" }}>
          <TopNav
            title="Acme Consulting"
            subtitle="Preview mode"
            links={links}
            avatarInitials="HB"
            notificationCount={3}
            onNavigateHome={act("TopNav home clicked")}
            onCreateBill={act("TopNav create-bill clicked")}
            onSearchClick={act("TopNav search clicked")}
            onNotificationsClick={act("TopNav notifications clicked")}
            onAvatarClick={act("TopNav avatar clicked")}
          >
            <select aria-label="Company" defaultValue="acme" style={{ fontSize: "0.85rem" }}>
              <option value="acme">Acme Consulting</option>
              <option value="other">Other Co.</option>
            </select>
          </TopNav>
          <div style={{ padding: "1.5rem", color: "var(--bg-ink-soft)", fontSize: "0.9rem" }}>
            (page content would render here)
          </div>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--bg-ink-soft)" }}>
          Click a link below to move the "active" state — this simulates route
          changes without a router.
        </p>
        <Row>
          {links.map((link) => (
            <Button
              key={link.key}
              variant="ghost"
              size="sm"
              onClick={() =>
                setLinks((prev) => prev.map((l) => ({ ...l, active: l.key === link.key })))
              }
            >
              activate: {link.label}
            </Button>
          ))}
        </Row>
      </Section>

      <Section title="LoadingScreen — logo printing invoices">
        <div style={{ border: "1px solid var(--bg-line)", borderRadius: "var(--bg-radius)" }}>
          <LoadingScreen label="Fetching your invoices…" />
        </div>
      </Section>
    </div>
  );
}
