/** Company settings — the edit form B3 unblocked on the server months before
 *  anything on screen could write a single field.
 *
 *  One panel, six sections. The IA splits the company record across
 *  `company/profile`, `legal`, `vat`, `bank`, `numbering` and `defaults`, but
 *  they are all PATCH /companies/{id} against one row, so they are one
 *  component with a `section` prop rather than six near-copies of the same
 *  form. `section="all"` renders the lot for a single settings screen.
 *
 *  Two things this screen takes seriously:
 *
 *  1. **PATCH means patch.** Only fields the user actually changed are sent.
 *     A form that echoes every field back turns "I fixed the BIC" into a write
 *     over the whole record — and the record is embedded in every issued PDF,
 *     so a stale value round-tripping from a tab opened yesterday is a real
 *     way to corrupt data. Untouched fields are absent from the body.
 *
 *  2. **The verdicts belong to the SAVED record.** `GET /companies/{id}/validate`
 *     checks what is in the database, not what is in the input. So a field with
 *     unsaved edits drops its verdict and says so, rather than showing a green
 *     tick that refers to the value the user has just replaced.
 *
 *  What `peppol_ready` here does and does not mean is the same caveat the
 *  endpoint carries: it is the *supplier* half of the gate. A ready company can
 *  still be refused at export time because the customer half fails — a B2C
 *  client has no VAT number and never will. So the banner says the company is
 *  ready to be a Peppol sender, never that an invoice will be delivered.
 */

import { useMemo, useState, type FormEvent } from "react";

import {
  Badge,
  Banner,
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  Select,
  Skeleton,
  TextInput,
} from "@henrioutai/ui";

import {
  useCompany,
  useCompanyValidation,
  usePdfTemplates,
  useUpdateCompany,
} from "../hooks/queries";
import { t, tPeppolError, type Lang, type MessageKey } from "../lib/translations";
import type { CompanyResponse, CompanyUpdateRequest, IdentifierCheck } from "../types";

/** The company record's editable fields, as the form holds them: strings, with
 *  "" standing for the model's null. `logo_key` is deliberately absent — it is
 *  written by blob storage (B2), not by a client. */
type EditableField =
  | "name"
  | "legal_name"
  | "registration_number"
  | "email"
  | "phone"
  | "address_line1"
  | "address_line2"
  | "postal_code"
  | "city"
  | "country_code"
  | "vat_number"
  | "iban"
  | "bic"
  | "invoice_reference_prefix"
  | "default_currency"
  | "default_language"
  | "default_pdf_template";

type Draft = Record<EditableField, string>;

export type CompanySection =
  | "all"
  | "profile"
  | "legal"
  | "vat"
  | "bank"
  | "numbering"
  | "defaults";

export interface CompanySettingsPanelProps {
  companyId: string;
  lang?: Lang;
  /** Which group of fields to edit. Defaults to the whole record. */
  section?: CompanySection;
  /** Overrides the section's own heading — a route passes the IA's label so the
   *  page title matches the nav item that led here. */
  title?: string;
}

/** Which fields each section owns. Their union is every editable field: one
 *  that belonged to no section would be silently uneditable. */
const SECTION_FIELDS: Record<Exclude<CompanySection, "all">, EditableField[]> = {
  profile: [
    "name",
    "email",
    "phone",
    "address_line1",
    "address_line2",
    "postal_code",
    "city",
    "country_code",
  ],
  legal: ["legal_name", "registration_number"],
  vat: ["vat_number"],
  bank: ["iban", "bic"],
  numbering: ["invoice_reference_prefix"],
  defaults: ["default_currency", "default_language", "default_pdf_template"],
};

const SECTION_ORDER: Exclude<CompanySection, "all">[] = [
  "profile",
  "legal",
  "vat",
  "bank",
  "numbering",
  "defaults",
];

const SECTION_TITLES: Record<Exclude<CompanySection, "all">, MessageKey> = {
  profile: "company.sectionProfile",
  legal: "company.sectionLegal",
  vat: "company.sectionVat",
  bank: "company.sectionBank",
  numbering: "company.sectionNumbering",
  defaults: "company.sectionDefaults",
};

const FIELD_LABELS: Record<EditableField, MessageKey> = {
  name: "company.name",
  legal_name: "company.legalName",
  registration_number: "company.registration",
  email: "company.email",
  phone: "company.phone",
  address_line1: "company.address",
  address_line2: "company.address2",
  postal_code: "company.postalCode",
  city: "company.city",
  country_code: "company.country",
  vat_number: "company.vat",
  iban: "company.iban",
  bic: "company.bic",
  invoice_reference_prefix: "company.prefix",
  default_currency: "company.currency",
  default_language: "company.language",
  default_pdf_template: "company.template",
};

/** The four names `missing_for_peppol` can carry, as labels. An unknown name —
 *  a backend that grew a fifth requirement — falls back to the wire value
 *  rather than dropping out of the list. */
const PEPPOL_FIELD_LABELS: Record<string, MessageKey> = {
  name: "company.name",
  address_line1: "company.address",
  vat_number: "company.vat",
  iban: "company.iban",
};

/** Sections that can move the Peppol verdict, and therefore show its banner. */
const PEPPOL_SECTIONS: CompanySection[] = ["all", "profile", "vat", "bank"];

/** The languages a PDF can be written in. Unlike the template list this is not
 *  served by an endpoint, so it stays a constant here. */
const LANGUAGES = ["en", "fr", "nl", "es"] as const;

/** `name` and the four code fields cannot be blanked: the model declares them
 *  non-null. An emptied input for them is an empty edit, not a null; every
 *  other field is nullable and clearing it means null. */
const NON_NULLABLE: EditableField[] = [
  "name",
  "country_code",
  "invoice_reference_prefix",
  "default_currency",
  "default_language",
  "default_pdf_template",
];

function toDraft(company: CompanyResponse): Draft {
  return {
    name: company.name ?? "",
    legal_name: company.legal_name ?? "",
    registration_number: company.registration_number ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    address_line1: company.address_line1 ?? "",
    address_line2: company.address_line2 ?? "",
    postal_code: company.postal_code ?? "",
    city: company.city ?? "",
    country_code: company.country_code ?? "",
    vat_number: company.vat_number ?? "",
    iban: company.iban ?? "",
    bic: company.bic ?? "",
    invoice_reference_prefix: company.invoice_reference_prefix ?? "",
    default_currency: company.default_currency ?? "",
    default_language: company.default_language ?? "",
    default_pdf_template: company.default_pdf_template ?? "",
  };
}

export function CompanySettingsPanel({
  companyId,
  lang = "en",
  section = "all",
  title,
}: CompanySettingsPanelProps) {
  const company = useCompany(companyId);
  const validation = useCompanyValidation(companyId);
  const templates = usePdfTemplates();
  const update = useUpdateCompany();

  // The saved record is the baseline; `edits` holds only what the user typed.
  // Nothing copies the record into state, so the refetch after a save shows the
  // server's version without an effect to keep the two in step.
  const [edits, setEdits] = useState<Partial<Draft>>({});
  const [saved, setSaved] = useState(false);

  const base = useMemo(() => (company.data ? toDraft(company.data) : null), [company.data]);

  const sections = section === "all" ? SECTION_ORDER : [section];
  const fields = sections.flatMap((name) => SECTION_FIELDS[name]);

  const value = (field: EditableField) => edits[field] ?? base?.[field] ?? "";
  const isDirty = (field: EditableField) =>
    base != null && edits[field] !== undefined && edits[field] !== base[field];
  const dirty = fields.filter(isDirty);

  const checks = new Map<string, IdentifierCheck>(
    (validation.data?.checks ?? []).map((check) => [check.field, check]),
  );

  const set = (field: EditableField) => (next: string) => {
    setSaved(false);
    setEdits((current) => ({ ...current, [field]: next }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (base == null || dirty.length === 0) return;
    const body: CompanyUpdateRequest = {};
    for (const field of dirty) {
      const next = (edits[field] ?? "").trim();
      if (field === "country_code" || field === "default_currency") {
        body[field] = next.toUpperCase();
      } else if (next === "" && !NON_NULLABLE.includes(field)) {
        body[field] = null;
      } else {
        body[field] = next;
      }
    }
    update.mutate(
      { companyId, body },
      {
        onSuccess: () => {
          setEdits({});
          setSaved(true);
        },
      },
    );
  };

  if (company.isError) {
    return (
      <div className="bg-stack">
        <PageHeader title={title ?? t(lang, "company.title")} />
        <Card>
          <ErrorState
            title={t(lang, "common.error")}
            onRetry={() => void company.refetch()}
            retryLabel={t(lang, "common.retry")}
          />
        </Card>
      </div>
    );
  }

  if (base == null) {
    return (
      <div className="bg-stack">
        <PageHeader title={title ?? t(lang, "company.title")} />
        <Card>
          <Skeleton lines={6} />
        </Card>
      </div>
    );
  }

  /** Label + input + the server's verdict on the saved value. */
  const renderField = (field: EditableField) => {
    const check = checks.get(field);
    const stale = isDirty(field);
    const label = t(lang, FIELD_LABELS[field]);

    // A verdict describes the stored value. Once the input differs from it, the
    // only honest thing to say is that it will be re-checked on save.
    const error =
      check && !check.valid && !stale ? tPeppolError(lang, check.message_key ?? "") : undefined;
    const hint = stale
      ? t(lang, "company.checkedOnSave")
      : check?.valid && check.normalized && check.normalized !== check.value
        ? `${t(lang, "company.normalized")}: ${check.normalized}`
        : undefined;

    if (field === "default_language") {
      return (
        <Field key={field} label={label} hint={hint}>
          <Select
            value={value(field)}
            options={LANGUAGES.map((code) => ({ value: code, label: code.toUpperCase() }))}
            onChange={(event) => set(field)(event.target.value)}
          />
        </Field>
      );
    }

    if (field === "default_pdf_template") {
      // From GET /pdf-templates, so the picker offers what the server can
      // actually render. Until it answers, the stored value is the only option
      // — an empty list would silently propose changing the template.
      const options = templates.data?.templates.map((template) => ({
        value: template.id,
        label: `${template.doc_title} · ${template.lang.toUpperCase()}`,
      })) ?? [{ value: value(field), label: value(field) }];
      return (
        <Field key={field} label={label} hint={hint}>
          <Select
            value={value(field)}
            options={options}
            onChange={(event) => set(field)(event.target.value)}
          />
        </Field>
      );
    }

    return (
      <Field key={field} label={label} required={field === "name"} error={error} hint={hint}>
        <TextInput
          value={value(field)}
          type={field === "email" ? "email" : "text"}
          required={field === "name"}
          invalid={error != null}
          maxLength={
            field === "country_code" || field === "default_currency"
              ? 3
              : field === "invoice_reference_prefix"
                ? 8
                : undefined
          }
          onChange={(event) => set(field)(event.target.value)}
        />
      </Field>
    );
  };

  const peppol = validation.data;
  const showPeppol = PEPPOL_SECTIONS.includes(section) && peppol != null;
  const missingLabels = (peppol?.missing_for_peppol ?? []).map((name) =>
    PEPPOL_FIELD_LABELS[name] ? t(lang, PEPPOL_FIELD_LABELS[name]) : name,
  );

  return (
    <form className="bg-stack" onSubmit={handleSubmit}>
      <PageHeader
        title={
          title ??
          (section === "all" ? t(lang, "company.title") : t(lang, SECTION_TITLES[section]))
        }
        subtitle={company.data?.name}
      />

      {showPeppol ? (
        peppol.peppol_ready ? (
          <Banner tone="success" title={t(lang, "company.peppolReady")}>
            {t(lang, "company.peppolSupplierOnly")}
          </Banner>
        ) : (
          <Banner tone="warn" title={t(lang, "company.peppolNotReady")}>
            {missingLabels.length > 0
              ? `${t(lang, "company.peppolMissing")}: ${missingLabels.join(", ")}. `
              : ""}
            {t(lang, "company.peppolSupplierOnly")}
          </Banner>
        )
      ) : null}

      {sections.map((name) => (
        <Card
          key={name}
          // On a one-section route the page header already carries this name,
          // and a card titled the same thing directly under it reads as a
          // rendering bug. Only the all-in-one screen needs section headings.
          title={section === "all" ? t(lang, SECTION_TITLES[name]) : undefined}
          actions={
            name === "vat" && checks.get("vat_number")?.valid === false ? (
              <Badge tone="danger">{t(lang, "company.invalid")}</Badge>
            ) : null
          }
        >
          <div className="bg-companyform__grid">{SECTION_FIELDS[name].map(renderField)}</div>
          {name === "numbering" ? (
            <p className="bg-companyform__note">{t(lang, "company.prefixHint")}</p>
          ) : null}
        </Card>
      ))}

      {update.isError ? <div role="alert">{t(lang, "common.error")}</div> : null}
      {saved ? (
        <Banner tone="success" onDismiss={() => setSaved(false)}>
          {t(lang, "company.saved")}
        </Banner>
      ) : null}

      <div className="bg-companyform__actions">
        <span className="bg-companyform__dirty">
          {dirty.length > 0 ? t(lang, "company.unsaved") : t(lang, "company.upToDate")}
        </span>
        <Button
          type="button"
          variant="ghost"
          disabled={dirty.length === 0 || update.isPending}
          onClick={() => setEdits({})}
        >
          {t(lang, "company.discard")}
        </Button>
        <Button type="submit" disabled={dirty.length === 0 || update.isPending}>
          {t(lang, "common.save")}
        </Button>
      </div>
    </form>
  );
}
