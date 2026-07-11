import { useState } from "react";
import { SettingsShell } from "../../../components/SettingsShell";
import { ThemeSwitcher, type ThemeValue } from "../../../components/ThemeSwitcher";
import { LanguageSwitcher } from "../../../components/LanguageSwitcher";
import { Segmented } from "../../../components/Segmented";
import { NotificationCenter, type NotificationItem } from "../../../components/NotificationCenter";
import { SuccessState } from "../../../components/SuccessState";
import { Kbd } from "../../../components/Kbd";
import { CopyButton } from "../../../components/CopyButton";
import { Button } from "../../../components/Button";
import { Field } from "../../../components/Field";
import { TextInput } from "../../../components/TextInput";
import { Card } from "../../../components/Card";
import {
  CompanyIcon,
  PolicyIcon,
  ForwardIcon,
  SearchIcon,
} from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

const SETTINGS_SECTIONS = [
  { key: "company", label: "Company details", description: "identity, VAT, IBAN", icon: <CompanyIcon /> },
  { key: "prefs", label: "Preferences", description: "theme & language", icon: <PolicyIcon /> },
  { key: "import", label: "Import data", description: "CSV / UBL", icon: <ForwardIcon /> },
  { key: "activity", label: "Activity log", description: "who did what", icon: <SearchIcon /> },
];

const INITIAL_NOTIFS: NotificationItem[] = [
  { key: "peppol", title: "Invoice 2026-0040 delivered", description: "Peppol access point confirmed receipt.", timestamp: "10:12", unread: true, tone: "success" },
  { key: "payment", title: "Payment received", description: "€ 2.000,00 on invoice 2026-0039.", timestamp: "08:47", unread: true, tone: "success" },
  { key: "import", title: "Import finished with 2 issues", description: "3 clients skipped a VAT check.", timestamp: "yesterday", tone: "danger" },
];

export function P1SettingsGallery({ onAction }: GalleryProps) {
  const [section, setSection] = useState("prefs");
  const [theme, setTheme] = useState<ThemeValue>(
    () => (document.documentElement.dataset.bgTheme === "dark" ? "dark" : "light")
  );
  const [language, setLanguage] = useState("fr");
  const [density, setDensity] = useState("comfy");
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const [successKey, setSuccessKey] = useState(0);

  const changeTheme = (t: ThemeValue) => {
    setTheme(t);
    window.dispatchEvent(new CustomEvent("bg-theme-change", { detail: t }));
    onAction(`ThemeSwitcher: ${t} (for real — the whole preview flipped)`);
  };

  return (
    <>
      <Section title="SettingsShell — section rail + content (Import & Activity live here, not in the nav)">
        <Card>
          <SettingsShell
            sections={SETTINGS_SECTIONS}
            activeKey={section}
            onSectionChange={(key) => {
              setSection(key);
              onAction(`Settings section: ${key}`);
            }}
          >
            {section === "company" ? (
              <>
                <Field label="Legal name" htmlFor="st-name">
                  <TextInput id="st-name" defaultValue="Henrioutai BV" />
                </Field>
                <Field label="VAT number" htmlFor="st-vat">
                  <TextInput id="st-vat" defaultValue="BE 0123.456.789" className="bg-num" />
                </Field>
              </>
            ) : section === "prefs" ? (
              <>
                <Field label="Theme" htmlFor="st-theme" hint="Wired to the real preview theme — flip it.">
                  <ThemeSwitcher theme={theme} onChange={changeTheme} />
                </Field>
                <Field label="Language" htmlFor="st-lang" hint="Invoice documents follow the client's locale, the UI follows yours.">
                  <LanguageSwitcher
                    languages={[{ code: "fr" }, { code: "nl" }, { code: "en" }]}
                    value={language}
                    onChange={(code) => {
                      setLanguage(code);
                      onAction(`LanguageSwitcher: ${code}`);
                    }}
                  />
                </Field>
                <Field label="Density" htmlFor="st-density" hint="Segmented is the shared primitive — any small exclusive choice.">
                  <Segmented
                    ariaLabel="Density"
                    size="sm"
                    value={density}
                    onChange={(v) => {
                      setDensity(v);
                      onAction(`Segmented: ${v}`);
                    }}
                    options={[
                      { value: "comfy", label: "Comfy" },
                      { value: "compact", label: "Compact" },
                    ]}
                  />
                </Field>
              </>
            ) : section === "import" ? (
              <p style={{ margin: 0, color: "var(--bg-ink-soft)", fontSize: "var(--bg-text-body)" }}>
                (the FileUpload dropzone from the P1 forms batch mounts here)
              </p>
            ) : (
              <p style={{ margin: 0, color: "var(--bg-ink-soft)", fontSize: "var(--bg-text-body)" }}>
                (the activity List/Table from the data batch mounts here)
              </p>
            )}
          </SettingsShell>
        </Card>
      </Section>

      <Section title="NotificationCenter — bell + panel, unread halo, mark all read">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <NotificationCenter
            notifications={notifs.map((n) => ({
              ...n,
              onClick: () => onAction(`Notification opened: ${n.key}`),
            }))}
            onMarkAllRead={() => {
              setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
              onAction("Notifications: mark all read");
            }}
          />
        </div>
        <Label>Right-aligned like its real home next to the TopNav actions.</Label>
      </Section>

      <Section title="SuccessState — the check draws itself in (replay to watch)">
        <div style={{ border: "1px solid var(--bg-line)", borderRadius: "var(--bg-radius-surface)" }}>
          <SuccessState
            key={successKey}
            title="Invoice 2026-0043 issued"
            description="Locked, numbered and ready — send it via Peppol or download the PDF."
            action={
              <>
                <Button variant="secondary" onClick={() => setSuccessKey((k) => k + 1)}>
                  replay animation
                </Button>
                <Button onClick={() => onAction("SuccessState: View invoice")}>View invoice</Button>
              </>
            }
          />
        </div>
      </Section>

      <Section title="Kbd + CopyButton — the small stuff that makes it feel finished">
        <Row>
          <span style={{ fontSize: "var(--bg-text-body)" }}>
            Command palette: <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> · new invoice: <Kbd>N</Kbd>
          </span>
        </Row>
        <div style={{ height: "0.75rem" }} />
        <Row>
          <span style={{ fontSize: "var(--bg-text-body)" }}>
            VAT <span className="bg-num">BE 0123.456.789</span>{" "}
            <CopyButton value="BE0123456789" label="Copy VAT number" />
          </span>
          <span style={{ fontSize: "var(--bg-text-body)" }}>
            IBAN <span className="bg-num">BE71 0961 2345 6769</span>{" "}
            <CopyButton value="BE71096123456769" label="Copy IBAN" />
          </span>
        </Row>
        <Label>The icon flips to a check for ~1.6s after copying (normalized value, no spaces).</Label>
      </Section>
    </>
  );
}
