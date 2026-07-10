import { useState } from "react";
import { Button } from "../../../components/Button";
import { TopNav, type TopNavLink } from "../../../components/TopNav";
import {
  DashboardIcon,
  SettingsUserIcon,
  PolicyIcon,
  CompanyIcon,
  UpgradeIcon,
} from "../../../components/icons";
import { Section, Row, type GalleryProps } from "../ui";

/* Nav structure per Henri (2026-07-10): no "New invoice" link — the "+"
 * CreateBillButton IS the creator (was duplicated). Import data and Activity
 * log are not primary nav — they live inside the company settings page.
 * CompanyIcon (buildings) belongs to Company details; HelpIcon/SupportIcon
 * are reserved for the support service. UpgradeIcon on Products & services
 * is a placeholder until a custom icon is drawn. */
const SAMPLE_LINKS: TopNavLink[] = [
  { key: "dashboard", label: "Dashboard", icon: <DashboardIcon />, active: true },
  { key: "clients", label: "Clients", icon: <SettingsUserIcon /> },
  { key: "products", label: "Products & services", icon: <UpgradeIcon /> },
  { key: "invoices", label: "Invoices", icon: <PolicyIcon /> },
  { key: "settings", label: "Company details", icon: <CompanyIcon /> },
];

export function NavGallery({ onAction }: GalleryProps) {
  const [links, setLinks] = useState(SAMPLE_LINKS);

  return (
    <Section title="TopNav — assembled, links replace a sidebar">
      <div style={{ border: "1px solid var(--bg-line)", borderRadius: "var(--bg-radius)", overflow: "hidden" }}>
        <TopNav
          title="Acme Consulting"
          subtitle="Preview mode"
          links={links}
          avatarInitials="HB"
          notificationCount={3}
          onNavigateHome={() => onAction("TopNav home clicked")}
          onCreateBill={() => onAction("TopNav create-bill clicked")}
          onSearchClick={() => onAction("TopNav search clicked")}
          onNotificationsClick={() => onAction("TopNav notifications clicked")}
          onAvatarClick={() => onAction("TopNav avatar clicked")}
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
        Click a link below to move the "active" state — this simulates route changes without a router.
      </p>
      <Row>
        {links.map((link) => (
          <Button
            key={link.key}
            variant="ghost"
            size="sm"
            onClick={() => setLinks((prev) => prev.map((l) => ({ ...l, active: l.key === link.key })))}
          >
            activate: {link.label}
          </Button>
        ))}
      </Row>
    </Section>
  );
}
