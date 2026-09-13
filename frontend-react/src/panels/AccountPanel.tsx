/** Settings → Account: who you are, what you call your business, and the
 *  interface language.
 *
 *  The IA note for this node said "profile is readable and not editable",
 *  which stopped being true when `PATCH /users/me` landed for the first run's
 *  profile step. The two names the wizard asks for are the two names here,
 *  saved by the same two calls — a person who typed a placeholder past the
 *  wizard has to be able to fix it somewhere that is not the wizard.
 *
 *  The e-mail is shown and not editable, for the reason the schema gives:
 *  an address change is an identity change and needs a verification message
 *  the product cannot send (B1). On a desktop install it is also the key the
 *  bootstrap finds its user by. */

import { useEffect, useState, type FormEvent } from "react";

import { Badge, Banner, Button, Card, ErrorState, Field, LanguageSwitcher, PageHeader, Skeleton, TextInput } from "@henrioutai/ui";

import { useCurrentOrganization, useMe, useRenameOrganization, useUpdateMe } from "../hooks/queries";
import { LANGS, t, type Lang } from "../lib/translations";
import { useLang } from "../providers/LanguageProvider";

export interface AccountPanelProps {
  lang?: Lang;
  title?: string;
}

export function AccountPanel({ lang = "en", title }: AccountPanelProps) {
  const me = useMe();
  const organization = useCurrentOrganization();
  const updateMe = useUpdateMe();
  const rename = useRenameOrganization();
  const { setLang } = useLang();

  const [name, setName] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The inputs hold only what was typed; the record is the baseline. A refetch
  // after a save therefore shows the server's version, and a stale tab cannot
  // write yesterday's name back over today's.
  useEffect(() => {
    if (updateMe.isSuccess || rename.isSuccess) setSaved(true);
  }, [updateMe.isSuccess, rename.isSuccess]);

  if (me.isError) {
    return (
      <Card>
        <ErrorState title={t(lang, "common.error")} onRetry={() => void me.refetch()} retryLabel={t(lang, "common.retry")} />
      </Card>
    );
  }
  if (!me.data) {
    return (
      <div className="bg-stack">
        <PageHeader title={title ?? t(lang, "account.title")} />
        <Card>
          <Skeleton lines={5} />
        </Card>
      </div>
    );
  }

  const currentName = name ?? me.data.display_name;
  const currentOrg = orgName ?? organization.data?.name ?? "";
  const nameDirty = name !== null && name.trim() !== me.data.display_name && name.trim() !== "";
  const orgDirty = orgName !== null && orgName.trim() !== (organization.data?.name ?? "") && orgName.trim() !== "";
  const pending = updateMe.isPending || rename.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    if (nameDirty) updateMe.mutate({ display_name: currentName.trim() }, { onSuccess: () => setName(null) });
    if (orgDirty) rename.mutate(currentOrg.trim(), { onSuccess: () => setOrgName(null) });
  };

  return (
    <div className="bg-stack">
      <PageHeader title={title ?? t(lang, "account.title")} subtitle={t(lang, "settings.desc.account")} />

      <form className="bg-stack" onSubmit={submit}>
        <Card title={t(lang, "account.identity")} actions={<Badge tone="info">{me.data.role}</Badge>}>
          <div className="bg-companyform__grid">
            <Field label={t(lang, "onboarding.profile.yourName")} required>
              <TextInput
                value={currentName}
                required
                onChange={(event) => {
                  setSaved(false);
                  setName(event.target.value);
                }}
              />
            </Field>
            <Field label={t(lang, "onboarding.profile.orgName")} hint={t(lang, "onboarding.profile.orgHint")} required>
              <TextInput
                value={currentOrg}
                required
                onChange={(event) => {
                  setSaved(false);
                  setOrgName(event.target.value);
                }}
              />
            </Field>
            <Field label={t(lang, "account.email")} hint={t(lang, "account.emailHint")}>
              <TextInput value={me.data.email} readOnly disabled />
            </Field>
          </div>
          {updateMe.isError || rename.isError ? <div role="alert">{t(lang, "common.error")}</div> : null}
          {saved && !nameDirty && !orgDirty ? (
            <Banner tone="success" onDismiss={() => setSaved(false)}>
              {t(lang, "common.saved")}
            </Banner>
          ) : null}
          <div className="bg-companyform__actions">
            <Button type="submit" disabled={pending || (!nameDirty && !orgDirty)}>
              {t(lang, "common.save")}
            </Button>
          </div>
        </Card>
      </form>

      <Card title={t(lang, "account.preferences")}>
        <div className="bg-pref">
          <div className="bg-pref__text">
            <span className="bg-pref__label">{t(lang, "settings.language")}</span>
            <span className="bg-pref__hint">{t(lang, "settings.languageHint")}</span>
          </div>
          <div className="bg-pref__control">
            <LanguageSwitcher
              languages={LANGS.map((entry) => ({ code: entry.value, label: entry.short }))}
              value={lang}
              onChange={(code) => setLang(code as Lang)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
