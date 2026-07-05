import { useId, useState, type FormEvent } from "react";

import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { useCreateCompany } from "../hooks/queries";
import { t, type Lang } from "../lib/translations";
import type { CompanyResponse } from "../types";

export interface CompanyFormProps {
  lang?: Lang;
  onCreated?: (company: CompanyResponse) => void;
}

const PDF_TEMPLATES = ["fr_standard", "fr_detailed", "nl_minimal"] as const;
const LANGUAGES = ["en", "fr", "nl", "es"] as const;

export function CompanyForm({ lang = "en", onCreated }: CompanyFormProps) {
  const selectIdBase = useId();
  const createCompany = useCreateCompany();

  const [name, setName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [prefix, setPrefix] = useState("");
  const [language, setLanguage] = useState<string>("fr");
  const [template, setTemplate] = useState<string>("fr_standard");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createCompany.mutate(
      {
        name,
        vat_number: vatNumber || null,
        iban: iban || null,
        bic: bic || null,
        invoice_reference_prefix: prefix,
        default_language: language,
        default_pdf_template: template,
      },
      { onSuccess: (company) => onCreated?.(company) },
    );
  };

  return (
    <section className="bg-panel" aria-label={t(lang, "company.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "company.title")}</h1>
      </header>
      <form onSubmit={handleSubmit}>
        <Field
          label={t(lang, "company.name")}
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
        <Field
          label={t(lang, "company.vat")}
          value={vatNumber}
          onChange={(event) => setVatNumber(event.target.value)}
        />
        <Field
          label={t(lang, "company.iban")}
          value={iban}
          onChange={(event) => setIban(event.target.value)}
        />
        <Field
          label={t(lang, "company.bic")}
          value={bic}
          onChange={(event) => setBic(event.target.value)}
        />
        <Field
          label={t(lang, "company.prefix")}
          value={prefix}
          maxLength={8}
          onChange={(event) => setPrefix(event.target.value)}
        />

        <div className="bg-field">
          <label className="bg-field__label" htmlFor={`${selectIdBase}-lang`}>
            {t(lang, "company.language")}
          </label>
          <select
            id={`${selectIdBase}-lang`}
            className="bg-field__input"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-field">
          <label className="bg-field__label" htmlFor={`${selectIdBase}-template`}>
            {t(lang, "company.template")}
          </label>
          <select
            id={`${selectIdBase}-template`}
            className="bg-field__input"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            {PDF_TEMPLATES.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        {createCompany.isError ? <div role="alert">{t(lang, "common.error")}</div> : null}
        <div className="bg-panel__actions">
          <Button type="submit" disabled={createCompany.isPending}>
            {t(lang, "common.create")}
          </Button>
        </div>
      </form>
    </section>
  );
}
