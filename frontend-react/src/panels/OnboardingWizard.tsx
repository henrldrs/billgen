/** The guided first run (T-29), from Henri's `docs/onboarding feature .txt`.
 *
 *  Five steps: language & look, the company, the legal texts, a first client
 *  and service, and the first invoice. The screen holds no truth of its own:
 *  `GET /onboarding` is re-read after every act, and it is the server that
 *  decides whether setup can be finished — a company that fails validation or
 *  an unaccepted text is refused there, not merely greyed out here.
 *
 *  What the spec asks for that this cut does not carry, and why: the feature
 *  toggles of step 3 need an `organization.modules` model that does not exist;
 *  logo upload needs somewhere for a file to live (B2); the sample-invoice
 *  extraction is an AI surface with no backing. Each is named in the ticket.
 *  The legal step is data-driven — it lists the published texts that require
 *  acceptance, and with the registry as it stands today that list is empty
 *  and the step says so rather than inventing a checkbox.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LanguageSwitcher,
  PageHeader,
  Spinner,
  Stepper,
  TextInput,
  ThemeSwitcher,
} from "@henrioutai/ui";

import {
  useAcceptLegalText,
  useCompleteOnboarding,
  useCreateClient,
  useCreateProduct,
  useOnboardingStatus,
  useRenameOrganization,
  useUpdateMe,
} from "../hooks/queries";
import { requestTour } from "../lib/tour";
import { LANGS, t, type Lang } from "../lib/translations";
import { useLang } from "../providers/LanguageProvider";
import { useTheme } from "../lib/theme";
import type { OnboardingStatusResponse } from "../types";
import { CompanyForm } from "./CompanyForm";

const STEP_KEYS = ["language", "profile", "company", "legal", "seed", "done"] as const;
type StepKey = (typeof STEP_KEYS)[number];

export interface OnboardingWizardProps {
  /** Where "create my first invoice" goes. The builder is an action, not an
   *  IA destination, so the path is the shell's to name. */
  firstInvoicePath?: string;
  /** Where finishing lands. */
  homePath?: string;
}

export function OnboardingWizard({
  firstInvoicePath = "/app/sales/invoices/new",
  homePath = "/app",
}: OnboardingWizardProps) {
  const { lang } = useLang();
  const status = useOnboardingStatus();
  const [step, setStep] = useState<StepKey>("language");

  const steps = useMemo(
    () =>
      STEP_KEYS.map((key) => ({
        key,
        label: t(lang, `onboarding.step.${key}` as const),
      })),
    [lang],
  );

  if (status.isLoading || !status.data) {
    return (
      <section className="bg-onboarding bg-stack" aria-busy="true">
        <Spinner label={t(lang, "common.loading")} />
      </section>
    );
  }

  const index = STEP_KEYS.indexOf(step);
  const next = () => setStep(STEP_KEYS[Math.min(index + 1, STEP_KEYS.length - 1)]);
  const back = () => setStep(STEP_KEYS[Math.max(index - 1, 0)]);

  return (
    <section className="bg-onboarding bg-stack" aria-label={t(lang, "onboarding.title")}>
      <PageHeader title={t(lang, "onboarding.title")} subtitle={t(lang, "onboarding.subtitle")} />
      <Stepper steps={steps} activeKey={step} onStepClick={(key) => setStep(key as StepKey)} />

      <Card>
        {step === "language" ? <LanguageStep lang={lang} /> : null}
        {step === "profile" ? <ProfileStep lang={lang} status={status.data} /> : null}
        {step === "company" ? <CompanyStep lang={lang} status={status.data} /> : null}
        {step === "legal" ? <LegalStep lang={lang} status={status.data} /> : null}
        {step === "seed" ? <SeedStep lang={lang} status={status.data} /> : null}
        {step === "done" ? (
          <DoneStep
            lang={lang}
            status={status.data}
            firstInvoicePath={firstInvoicePath}
            homePath={homePath}
          />
        ) : null}

        <div className="bg-onboarding__nav">
          <Button variant="ghost" onClick={back} disabled={index === 0}>
            {t(lang, "onboarding.back")}
          </Button>
          {step !== "done" ? (
            <Button variant="primary" onClick={next}>
              {t(lang, "onboarding.next")}
            </Button>
          ) : null}
        </div>
      </Card>
    </section>
  );
}

// ------------------------------------------------------------ 1 · language

function LanguageStep({ lang }: { lang: Lang }) {
  const { setLang } = useLang();
  const [theme, setTheme] = useTheme();
  return (
    <div className="bg-stack">
      <Field label={t(lang, "onboarding.step.language")} hint={t(lang, "onboarding.language.hint")}>
        <LanguageSwitcher
          languages={LANGS.map((l) => ({ code: l.value, label: l.short }))}
          value={lang}
          onChange={(code) => setLang(code as Lang)}
        />
      </Field>
      <Field label={t(lang, "onboarding.theme")}>
        <ThemeSwitcher theme={theme} onChange={setTheme} />
      </Field>
      <p className="bg-muted">{t(lang, "onboarding.locale.hint")}</p>
    </div>
  );
}

// ------------------------------------------------------------- 2 · profile

/** Who is accepting, and for what. Both names land on the contract PDF the
 *  legal step writes, and the desktop bootstrap starts them as placeholders —
 *  "Local user" for "My Business" — so the server refuses to finish the first
 *  run until a person has typed over both.
 *
 *  The e-mail is deliberately absent. On a desktop install it is the key the
 *  bootstrap finds its singleton user by; changing it would produce a second
 *  user and a second organization on the next launch. */
function ProfileStep({ lang, status }: { lang: Lang; status: OnboardingStatusResponse }) {
  const updateMe = useUpdateMe();
  const rename = useRenameOrganization();
  const [name, setName] = useState(status.display_name ?? "");
  const [orgName, setOrgName] = useState(status.organization_name ?? "");

  return (
    <form
      className="bg-stack"
      onSubmit={(event) => {
        event.preventDefault();
        updateMe.mutate({ display_name: name.trim() });
        rename.mutate(orgName.trim());
      }}
    >
      <p className="bg-muted">{t(lang, "onboarding.profile.hint")}</p>
      <Field label={t(lang, "onboarding.profile.yourName")} required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field
        label={t(lang, "onboarding.profile.orgName")}
        hint={t(lang, "onboarding.profile.orgHint")}
        required
      >
        <TextInput value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
      </Field>
      <div className="bg-actions">
        <Button
          type="submit"
          variant="secondary"
          disabled={updateMe.isPending || rename.isPending || !name.trim() || !orgName.trim()}
        >
          {t(lang, "common.save")}
        </Button>
        {status.profile_complete ? <Badge tone="success">{t(lang, "common.saved")}</Badge> : null}
      </div>
      <p className="bg-muted">{t(lang, "onboarding.profile.localAccount")}</p>
    </form>
  );
}

// ------------------------------------------------------------- 3 · company

function CompanyStep({ lang, status }: { lang: Lang; status: OnboardingStatusResponse }) {
  const navigate = useNavigate();
  if (!status.company_id) {
    return (
      <div className="bg-stack">
        <p className="bg-muted">{t(lang, "onboarding.company.hint")}</p>
        <CompanyForm lang={lang} />
      </div>
    );
  }
  return (
    <div className="bg-stack">
      <p className="bg-muted">{t(lang, "onboarding.company.hint")}</p>
      {status.company_valid ? (
        <Badge tone="success">{t(lang, "onboarding.company.valid")}</Badge>
      ) : (
        <div role="alert" className="bg-stack">
          <Badge tone="danger">{t(lang, "onboarding.company.invalid")}</Badge>
          <ul>
            {status.company_problems.map((field) => (
              <li key={field}>
                <code>{field}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <Button variant="secondary" onClick={() => navigate("/app/company/profile")}>
          {t(lang, "onboarding.company.edit")}
        </Button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- 4 · legal

function LegalStep({ lang, status }: { lang: Lang; status: OnboardingStatusResponse }) {
  const accept = useAcceptLegalText();
  if (status.required_texts.length === 0) {
    return <EmptyState title={t(lang, "onboarding.legal.none")} />;
  }
  return (
    <div className="bg-stack">
      <p className="bg-muted">{t(lang, "onboarding.legal.hint")}</p>
      <ul className="bg-onboarding__texts">
        {status.required_texts.map((text) => (
          <li key={text.key} className="bg-onboarding__text">
            <span>
              {text.title} <span className="bg-num">v{text.version}</span>
            </span>
            {text.accepted ? (
              <Badge tone="success">{t(lang, "onboarding.legal.accepted")}</Badge>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={accept.isPending}
                onClick={() => accept.mutate({ key: text.key, source: "onboarding" })}
              >
                {t(lang, "onboarding.legal.accept")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- 5 · seed

function SeedStep({ lang, status }: { lang: Lang; status: OnboardingStatusResponse }) {
  const createClient = useCreateClient();
  const createProduct = useCreateProduct();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientVat, setClientVat] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  const companyId = status.company_id;
  if (!companyId) {
    return <EmptyState title={t(lang, "onboarding.blocker.noCompany")} />;
  }

  return (
    <div className="bg-stack">
      <p className="bg-muted">{t(lang, "onboarding.seed.hint")}</p>

      <fieldset className="bg-onboarding__group">
        <legend>
          {t(lang, "onboarding.seed.client")}{" "}
          {status.clients > 0 ? (
            <Badge tone="success">{t(lang, "onboarding.seed.added")}</Badge>
          ) : null}
        </legend>
        {status.clients === 0 ? (
          <form
            className="bg-stack"
            onSubmit={(event) => {
              event.preventDefault();
              createClient.mutate({
                company_id: companyId,
                name: clientName.trim(),
                email: clientEmail.trim() || null,
                vat_number: clientVat.trim() || null,
                country_code: "BE",
                is_business: Boolean(clientVat.trim()),
              });
            }}
          >
            <Field label={t(lang, "clients.name")} required>
              <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </Field>
            <Field label={t(lang, "clients.email")}>
              <TextInput type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </Field>
            <Field label={t(lang, "clients.vat")}>
              <TextInput value={clientVat} onChange={(e) => setClientVat(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" disabled={createClient.isPending || !clientName.trim()}>
              {t(lang, "common.add")}
            </Button>
          </form>
        ) : null}
      </fieldset>

      <fieldset className="bg-onboarding__group">
        <legend>
          {t(lang, "onboarding.seed.service")}{" "}
          {status.products > 0 ? (
            <Badge tone="success">{t(lang, "onboarding.seed.added")}</Badge>
          ) : null}
        </legend>
        {status.products === 0 ? (
          <form
            className="bg-stack"
            onSubmit={(event) => {
              event.preventDefault();
              createProduct.mutate({
                company_id: companyId,
                name: serviceName.trim(),
                unit_price: servicePrice.trim(),
                default_vat_rate: "21.0",
              });
            }}
          >
            <Field label={t(lang, "products.name")} required>
              <TextInput value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
            </Field>
            <Field label={t(lang, "invoice.unitPrice")} required>
              <TextInput
                inputMode="decimal"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                required
              />
            </Field>
            <Button
              type="submit"
              variant="secondary"
              disabled={createProduct.isPending || !serviceName.trim() || !servicePrice.trim()}
            >
              {t(lang, "common.add")}
            </Button>
          </form>
        ) : null}
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------- 6 · done

function DoneStep({
  lang,
  status,
  firstInvoicePath,
  homePath,
}: {
  lang: Lang;
  status: OnboardingStatusResponse;
  firstInvoicePath: string;
  homePath: string;
}) {
  const navigate = useNavigate();
  const complete = useCompleteOnboarding();
  const done = status.completed_at !== null;

  return (
    <div className="bg-stack">
      {status.data_directory ? (
        <p className="bg-muted">
          {t(lang, "onboarding.data.hint")} <code className="bg-num">{status.data_directory}</code>
        </p>
      ) : null}

      {done ? (
        <p>{t(lang, "onboarding.done.hint")}</p>
      ) : status.can_complete ? (
        <Button
          variant="primary"
          disabled={complete.isPending}
          // Finishing setup is what earns the tour: it starts once the wizard
          // is left, from the shell, over the real screen.
          onClick={() => complete.mutate(undefined, { onSuccess: requestTour })}
        >
          {t(lang, "onboarding.done.finish")}
        </Button>
      ) : (
        <div role="alert" className="bg-stack">
          <Badge tone="warn">{t(lang, "onboarding.done.blocked")}</Badge>
          <ul>
            {status.blockers.map((blocker) => (
              <li key={blocker}>{blockerLabel(lang, blocker)}</li>
            ))}
          </ul>
        </div>
      )}

      {complete.isError ? (
        <p role="alert">{(complete.error as Error).message}</p>
      ) : null}

      {done ? (
        <div className="bg-onboarding__nav">
          <Button variant="ghost" onClick={() => navigate(homePath)}>
            {t(lang, "common.close")}
          </Button>
          <Button variant="primary" onClick={() => navigate(firstInvoicePath)}>
            {t(lang, "onboarding.done.firstInvoice")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** "company: vat_number" → "company identifiers: vat_number". The server's
 *  wording is for the audit log; a person gets the translated head and the
 *  server's field name, which is also what the input is called. */
function blockerLabel(lang: Lang, blocker: string): string {
  const [head, ...rest] = blocker.split(":");
  const detail = rest.join(":").trim();
  if (head === "profile") return t(lang, "onboarding.blocker.profile");
  if (head === "no company") return t(lang, "onboarding.blocker.noCompany");
  if (head === "company") return `${t(lang, "onboarding.blocker.company")}: ${detail}`;
  if (head === "accept") return `${t(lang, "onboarding.blocker.accept")} ${detail}`;
  return blocker;
}
