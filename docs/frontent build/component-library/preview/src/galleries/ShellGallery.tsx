import { Menu } from "../../../components/Menu";
import { AccountMenu } from "../../../components/AccountMenu";
import { AppShell } from "../../../components/AppShell";
import { TopNav, type TopNavLink } from "../../../components/TopNav";
import { Card } from "../../../components/Card";
import { Badge } from "../../../components/Badge";
import {
  DashboardIcon,
  SettingsUserIcon,
  PolicyIcon,
  CompanyIcon,
  UpgradeIcon,
  LanguageIcon,
  BackIcon,
  PlusIcon,
} from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

const NAV_LINKS: TopNavLink[] = [
  { key: "dashboard", label: "Dashboard", icon: <DashboardIcon />, active: true },
  { key: "clients", label: "Clients", icon: <SettingsUserIcon /> },
  { key: "products", label: "Products & services", icon: <UpgradeIcon /> },
  { key: "invoices", label: "Invoices", icon: <PolicyIcon /> },
  { key: "settings", label: "Company details", icon: <CompanyIcon /> },
];

function demoAccountMenu(onAction: (msg: string) => void) {
  return (
    <AccountMenu
      name="Henri B."
      email="h.enri@outlook.com"
      initials="HB"
      items={[
        {
          key: "company",
          label: "Company details",
          icon: <CompanyIcon />,
          onSelect: () => onAction("AccountMenu: Company details"),
        },
        {
          key: "language",
          label: "Language",
          icon: <LanguageIcon />,
          hint: "FR / NL",
          onSelect: () => onAction("AccountMenu: Language"),
        },
        { type: "separator", key: "sep" },
        {
          key: "signout",
          label: "Sign out",
          icon: <BackIcon />,
          danger: true,
          onSelect: () => onAction("AccountMenu: Sign out"),
        },
      ]}
    />
  );
}

export function ShellGallery({ onAction }: GalleryProps) {
  return (
    <>
      <Section title="Menu — dropdown primitive (overlay glass, arrows + Esc + outside click)">
        <Row>
          <Menu
            trigger="Invoice actions"
            triggerClassName="bg-button bg-button--secondary bg-button--sm"
            items={[
              {
                key: "pdf",
                label: "Download PDF",
                icon: <PolicyIcon />,
                onSelect: () => onAction("Menu: Download PDF"),
              },
              {
                key: "duplicate",
                label: "Duplicate",
                icon: <PlusIcon />,
                onSelect: () => onAction("Menu: Duplicate"),
              },
              {
                key: "peppol",
                label: "Send via Peppol",
                hint: "soon",
                disabled: true,
              },
              { type: "separator", key: "sep" },
              {
                key: "void",
                label: "Void invoice",
                danger: true,
                onSelect: () => onAction("Menu: Void invoice"),
              },
            ]}
          />
          <Menu
            align="end"
            trigger="Align end"
            triggerClassName="bg-button bg-button--ghost bg-button--sm"
            items={[
              { key: "a", label: "Popup right edge", onSelect: () => onAction("Menu: align end A") },
              { key: "b", label: "hugs the trigger", onSelect: () => onAction("Menu: align end B") },
            ]}
          />
        </Row>
        <Label>
          Trigger is any content — here the bg-button classes via triggerClassName; the avatar
          version below passes an IconChip.
        </Label>
      </Section>

      <Section title="AccountMenu — identity header + app-supplied actions">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {demoAccountMenu(onAction)}
        </div>
        <Label>
          Right-aligned like its real home (TopNav's accountSlot) — the popup hugs the trigger's
          right edge (align=&quot;end&quot;).
        </Label>
      </Section>

      <Section title="AppShell — backdrop + sticky TopNav + centered content (scroll the frame)">
        <div
          style={{
            height: 420,
            overflow: "auto",
            border: "1px solid var(--bg-line)",
            borderRadius: "var(--bg-radius-surface)",
          }}
        >
          <AppShell
            nav={
              <TopNav
                title="Acme Consulting"
                variant="translucent"
                links={NAV_LINKS}
                accountSlot={demoAccountMenu(onAction)}
                onNavigateHome={() => onAction("AppShell TopNav: home")}
                onCreateBill={() => onAction("AppShell TopNav: create bill")}
                onSearchClick={() => onAction("AppShell TopNav: search")}
                onNotificationsClick={() => onAction("AppShell TopNav: notifications")}
              />
            }
          >
            <Card
              title="Dashboard"
              subtitle="The home screen is a composition: AppShell + cards."
              actions={<Badge tone="success">synced</Badge>}
            >
              <p style={{ margin: 0 }}>
                Content column centers at 1100px (width=&quot;default&quot;), 1400px
                (&quot;wide&quot;) or unconstrained (&quot;full&quot;). The nav stays stuck to the
                top while this area scrolls.
              </p>
            </Card>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ marginTop: "1rem" }}>
                <Card title={`Filler card ${n}`}>
                  <p style={{ margin: 0, color: "var(--bg-ink-soft)" }}>
                    Scroll past me — the translucent TopNav blurs whatever slides underneath it.
                  </p>
                </Card>
              </div>
            ))}
          </AppShell>
        </div>
      </Section>
    </>
  );
}
