/** Everything an invoice carries that is not a customer or a line (§6).
 *
 *  Scaffold — see README.md.
 *
 *  Four sections, and three of them start collapsed. The blueprint asks for
 *  progressive disclosure and the reason is measurable: References, Payment
 *  and Additional together are nine fields, and nine fields on first paint is
 *  a form people abandon. Document is open because its fields are the ones
 *  every invoice sets.
 */

import { useState, type ReactNode } from "react";
import { DatePicker, Field, Select, TextInput, Textarea } from "@henrioutai/ui";

import type { DraftReferences, InvoiceDraft } from "./types";

export interface InvoiceDetailsPanelProps {
  draft: InvoiceDraft;
  onChange: (draft: InvoiceDraft) => void;
  currencies?: string[];
  languages?: string[];
}

const DEFAULT_CURRENCIES = ["EUR", "USD", "GBP"];
const DEFAULT_LANGUAGES = ["fr", "nl", "en", "es"];

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-ws-section">
      <button
        type="button"
        className="bg-ws-section__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {title}
      </button>
      {open && <div className="bg-ws-section__body">{children}</div>}
    </section>
  );
}

export function InvoiceDetailsPanel({
  draft,
  onChange,
  currencies = DEFAULT_CURRENCIES,
  languages = DEFAULT_LANGUAGES,
}: InvoiceDetailsPanelProps) {
  function patch(changes: Partial<InvoiceDraft>) {
    onChange({ ...draft, ...changes });
  }

  function patchReferences(changes: Partial<DraftReferences>) {
    onChange({ ...draft, references: { ...draft.references, ...changes } });
  }

  return (
    <div className="bg-stack">
      <Section title="Document" defaultOpen>
        <Field
          label="Invoice number"
          htmlFor="doc-reference"
          hint="Assigned by BillGen when the invoice is issued — the series must stay gapless."
        >
          <TextInput id="doc-reference" value={draft.reference ?? ""} disabled />
        </Field>
        <div className="bg-ws-row">
          <Field label="Issue date" htmlFor="doc-issue" required>
            <DatePicker
              id="doc-issue"
              value={draft.issueDate ?? null}
              onChange={(value) => patch({ issueDate: value ?? undefined })}
            />
          </Field>
          <Field label="Due date" htmlFor="doc-due">
            <DatePicker
              id="doc-due"
              value={draft.dueDate ?? null}
              onChange={(value) => patch({ dueDate: value ?? undefined })}
            />
          </Field>
        </div>
        <div className="bg-ws-row">
          <Field label="Currency" htmlFor="doc-currency">
            <Select
              id="doc-currency"
              options={currencies.map((code) => ({ value: code, label: code }))}
              value={draft.currency}
              onChange={(event) => patch({ currency: event.target.value })}
            />
          </Field>
          <Field label="Language" htmlFor="doc-language">
            <Select
              id="doc-language"
              options={languages.map((code) => ({ value: code, label: code.toUpperCase() }))}
              value={draft.language}
              onChange={(event) => patch({ language: event.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section title="References">
        <Field label="Purchase order" htmlFor="ref-po">
          <TextInput
            id="ref-po"
            value={draft.references.purchaseOrder ?? ""}
            onChange={(event) => patchReferences({ purchaseOrder: event.target.value })}
          />
        </Field>
        <Field label="Customer reference" htmlFor="ref-customer">
          <TextInput
            id="ref-customer"
            value={draft.references.customerReference ?? ""}
            onChange={(event) => patchReferences({ customerReference: event.target.value })}
          />
        </Field>
        <Field label="Project reference" htmlFor="ref-project">
          <TextInput
            id="ref-project"
            value={draft.references.projectReference ?? ""}
            onChange={(event) => patchReferences({ projectReference: event.target.value })}
          />
        </Field>
      </Section>

      <Section title="Payment">
        <Field label="Payment terms (days)" htmlFor="pay-terms">
          <TextInput
            id="pay-terms"
            inputMode="numeric"
            value={draft.payment.termsDays?.toString() ?? ""}
            onChange={(event) =>
              patch({ payment: { ...draft.payment, termsDays: Number(event.target.value) } })
            }
          />
        </Field>
        <Field label="IBAN" htmlFor="pay-iban">
          <TextInput
            id="pay-iban"
            value={draft.payment.iban ?? ""}
            onChange={(event) => patch({ payment: { ...draft.payment, iban: event.target.value } })}
          />
        </Field>
        <Field
          label="Structured communication"
          htmlFor="pay-structured"
          hint="The Belgian +++nnn/nnnn/nnnnn+++ reference, when the customer expects one."
        >
          <TextInput
            id="pay-structured"
            value={draft.payment.structuredCommunication ?? ""}
            onChange={(event) =>
              patch({
                payment: { ...draft.payment, structuredCommunication: event.target.value },
              })
            }
          />
        </Field>
      </Section>

      <Section title="Additional">
        <Field label="Notes" htmlFor="add-notes" hint="Printed on the invoice.">
          <Textarea
            id="add-notes"
            rows={3}
            value={draft.notes ?? ""}
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </Field>
        <Field label="Terms & conditions" htmlFor="add-terms">
          <Textarea
            id="add-terms"
            rows={3}
            value={draft.terms ?? ""}
            onChange={(event) => patch({ terms: event.target.value })}
          />
        </Field>
        <Field label="Internal note" htmlFor="add-internal" hint="Never printed, never sent.">
          <Textarea
            id="add-internal"
            rows={2}
            value={draft.internalNote ?? ""}
            onChange={(event) => patch({ internalNote: event.target.value })}
          />
        </Field>
      </Section>
    </div>
  );
}
