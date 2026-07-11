import { useId, useState, type FormEvent } from "react";

import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { TextInput } from "../components/TextInput";
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
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("BE");
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
        registration_number: registrationNumber || null,
        email: email || null,
        address_line1: addressLine1 || null,
        postal_code: postalCode || null,
        city: city || null,
        country_code: countryCode.toUpperCase() || "BE",
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
        <Field label={t(lang, "company.name")} required>
          <TextInput
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.vat")}>
          <TextInput
            value={vatNumber}
            onChange={(event) => setVatNumber(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.registration")}>
          <TextInput
            value={registrationNumber}
            onChange={(event) => setRegistrationNumber(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.email")}>
          <TextInput
            value={email}
            type="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.address")}>
          <TextInput
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.postalCode")}>
          <TextInput
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.city")}>
          <TextInput
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.country")}>
          <TextInput
            value={countryCode}
            maxLength={2}
            onChange={(event) => setCountryCode(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.iban")}>
          <TextInput
            value={iban}
            onChange={(event) => setIban(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.bic")}>
          <TextInput
            value={bic}
            onChange={(event) => setBic(event.target.value)}
          />
        </Field>
        <Field label={t(lang, "company.prefix")}>
          <TextInput
            value={prefix}
            maxLength={8}
            onChange={(event) => setPrefix(event.target.value)}
          />
        </Field>

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
