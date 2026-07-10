import { useState } from "react";
import { Card } from "../../../components/Card";
import { Field } from "../../../components/Field";
import { TextInput } from "../../../components/TextInput";
import { Textarea } from "../../../components/Textarea";
import { Select } from "../../../components/Select";
import { Checkbox } from "../../../components/Checkbox";
import { RadioGroup } from "../../../components/RadioGroup";
import { Switch } from "../../../components/Switch";
import { SearchBar } from "../../../components/SearchBar";
import { Button } from "../../../components/Button";
import { Section, Row, type GalleryProps } from "../ui";

export function FormGallery({ onAction }: GalleryProps) {
  const [vat, setVat] = useState("BE 0123");
  const [language, setLanguage] = useState("");
  const [delivery, setDelivery] = useState("peppol");
  const [reminders, setReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const vatValid = /^BE ?\d{4}\.?\d{3}\.?\d{3}$/.test(vat.trim());

  return (
    <>
      <Section title="Field + TextInput — valid, invalid (live: type a full BE VAT), disabled">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <Field label="Client name" htmlFor="f-name" hint="As it appears on the invoice." required>
            <TextInput
              id="f-name"
              placeholder="Acme Consulting BV"
              onChange={(e) => onAction(`Client name = "${e.target.value}"`)}
            />
          </Field>
          <Field
            label="VAT number"
            htmlFor="f-vat"
            required
            error={vatValid ? undefined : "Expected format: BE 0123.456.789"}
            hint="Belgian format."
          >
            <TextInput id="f-vat" invalid={!vatValid} value={vat} onChange={(e) => setVat(e.target.value)} className="bg-num" />
          </Field>
          <Field label="Client number" htmlFor="f-num" hint="Assigned automatically — IDs render in Geist Mono.">
            <TextInput id="f-num" value="CL-0087" disabled readOnly className="bg-num" />
          </Field>
        </div>
      </Section>

      <Section title="Textarea">
        <Field label="Notes on invoice" htmlFor="f-notes" hint="Shown under the line items on the PDF.">
          <Textarea
            id="f-notes"
            placeholder="Payment within 30 days…"
            onChange={(e) => onAction(`Notes = "${e.target.value.slice(0, 40)}"`)}
          />
        </Field>
      </Section>

      <Section title="Select — with placeholder">
        <div style={{ maxWidth: 320 }}>
          <Field label="Invoice language" htmlFor="f-lang" required>
            <Select
              id="f-lang"
              placeholder="Choose a language…"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                onAction(`Language = "${e.target.value}"`);
              }}
              options={[
                { value: "fr", label: "Français" },
                { value: "nl", label: "Nederlands" },
                { value: "en", label: "English" },
                { value: "de", label: "Deutsch (coming later)", disabled: true },
              ]}
            />
          </Field>
        </div>
      </Section>

      <Section title="Checkbox">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <Checkbox
            label="Send a copy to myself"
            onChange={(e) => onAction(`Send copy = ${e.target.checked}`)}
          />
          <Checkbox
            label="Attach payment QR code"
            hint="EPC QR, scannable by Belgian banking apps."
            defaultChecked
            onChange={(e) => onAction(`QR code = ${e.target.checked}`)}
          />
          <Checkbox label="Legacy option" hint="Disabled — kept for old invoices." disabled />
        </div>
      </Section>

      <Section title="RadioGroup — column and row">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
          <RadioGroup
            name="delivery"
            value={delivery}
            onChange={(v) => {
              setDelivery(v);
              onAction(`Delivery = "${v}"`);
            }}
            options={[
              { value: "peppol", label: "Peppol", hint: "Structured e-invoice, required B2B from 2026." },
              { value: "email", label: "Email PDF" },
              { value: "manual", label: "Download only" },
            ]}
          />
          <RadioGroup
            name="tier"
            direction="row"
            value="free"
            onChange={(v) => onAction(`Tier = "${v}"`)}
            options={[
              { value: "free", label: "Free" },
              { value: "pro", label: "Pro" },
              { value: "team", label: "Team" },
            ]}
          />
        </div>
      </Section>

      <Section title="Switch — instant-effect boolean">
        <Row>
          <Switch
            checked={reminders}
            onChange={(v) => {
              setReminders(v);
              onAction(`Payment reminders = ${v}`);
            }}
            label="Payment reminders"
          />
          <Switch
            checked={darkMode}
            onChange={(v) => {
              setDarkMode(v);
              onAction(`Dark mode = ${v} (not themed yet — just the control)`);
            }}
            label="Dark mode"
          />
          <Switch checked disabled onChange={() => {}} label="Locked setting (disabled)" />
        </Row>
      </Section>

      <Section title="SearchBar — type, Enter to submit, × or Esc to clear">
        <SearchBar
          placeholder="Search invoices, clients…"
          onSubmit={(q) => onAction(`Search submitted: "${q}"`)}
          onValueChange={(q) => {
            if (q === "") onAction("Search cleared");
          }}
        />
      </Section>

      <Section title="Composed — a client form assembled from the pieces above">
        <Card
          title="New client"
          subtitle="Card + PageHeader batch works together with this one"
          footer="Nothing here talks to a backend — presentational only."
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
            <Field label="Company name" htmlFor="c-name" required>
              <TextInput id="c-name" placeholder="Acme Consulting BV" />
            </Field>
            <Field label="Email" htmlFor="c-email" required>
              <TextInput id="c-email" type="email" placeholder="billing@acme.be" />
            </Field>
          </div>
          <Field label="Address" htmlFor="c-address">
            <Textarea id="c-address" rows={2} placeholder="Rue de la Loi 1, 1000 Bruxelles" />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <Button variant="secondary" onClick={() => onAction("Client form: Cancel")}>
              Cancel
            </Button>
            <Button onClick={() => onAction("Client form: Save client")}>Save client</Button>
          </div>
        </Card>
      </Section>
    </>
  );
}
