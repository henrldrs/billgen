import { useState } from "react";
import { Combobox } from "../../../components/Combobox";
import { DatePicker } from "../../../components/DatePicker";
import { FileUpload } from "../../../components/FileUpload";
import { Field } from "../../../components/Field";
import { Section, Label, type GalleryProps } from "../ui";

const CLIENTS = [
  { value: "acme", label: "Acme Consulting BV", hint: "BE 0123.456.789" },
  { value: "blauwhuis", label: "Blauwhuis NV", hint: "BE 0987.654.321" },
  { value: "cactus", label: "Cactus & Co", hint: "no VAT on file" },
  { value: "dewilde", label: "De Wilde Advocaten", hint: "BE 0456.789.123" },
  { value: "elysia", label: "Elysia Studio", hint: "BE 0741.852.963" },
  { value: "frozen", label: "Frozen Fjord (archived)", disabled: true },
];

export function P1FormsGallery({ onAction }: GalleryProps) {
  const [client, setClient] = useState<string | null>("acme");
  const [issueDate, setIssueDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);

  return (
    <>
      <Section title="Combobox — type to filter, Up/Down + Enter, × clears">
        <div style={{ maxWidth: 380 }}>
          <Field label="Client" htmlFor="cb-client" hint="Closed list — archived clients are disabled.">
            <Combobox
              id="cb-client"
              options={CLIENTS}
              value={client}
              onChange={(v) => {
                setClient(v);
                onAction(`Combobox: ${v ?? "(cleared)"}`);
              }}
              placeholder="Search clients…"
            />
          </Field>
        </div>
      </Section>

      <Section title="DatePicker — Monday-first grid, Today/Clear, dd/mm/yyyy">
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Field label="Issue date" htmlFor="dp-issue">
            <DatePicker
              id="dp-issue"
              value={issueDate}
              onChange={(v) => {
                setIssueDate(v);
                onAction(`DatePicker issue: ${v ?? "(cleared)"}`);
              }}
            />
          </Field>
          <Field
            label="Due date"
            htmlFor="dp-due"
            hint={issueDate ? "Bounded: can't precede the issue date." : "Pick an issue date first to see min-bounding."}
          >
            <DatePicker
              id="dp-due"
              value={dueDate}
              min={issueDate ?? undefined}
              onChange={(v) => {
                setDueDate(v);
                onAction(`DatePicker due: ${v ?? "(cleared)"}`);
              }}
              placeholder="Pick due date"
            />
          </Field>
        </div>
        <Label>Arrow keys walk the day grid once a day has focus; Esc closes.</Label>
      </Section>

      <Section title="FileUpload — drop or browse, chips with remove">
        <div style={{ maxWidth: 480 }}>
          <FileUpload
            multiple
            accept=".csv,.xml"
            hint="CSV or UBL XML — the import panel's future front door."
            onFiles={(files) => onAction(`FileUpload: ${files.length} file(s) [${files.map((f) => f.name).join(", ")}]`)}
          />
        </div>
      </Section>
    </>
  );
}
