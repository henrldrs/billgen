/** Settings → Data & privacy — T-29's permanent half.
 *
 *  What the first run says once, this screen keeps: the folder the data
 *  actually resolved to (from `GET /onboarding`, never hard-coded), what each
 *  sub-folder holds, the art. 30 register with its retention column, the list
 *  of what an erasure leaves in place, who else receives the data (on a
 *  desktop install: nobody), the legal texts and their acceptance state, and
 *  the way to the backup controls.
 *
 *  Every legal sentence is the server's — the register, the retention
 *  positions and the texts come from `core/trust` through the API. What is
 *  typed here is the product's description of its own folders, which is a
 *  product fact and not a legal one.
 *
 *  Absent, and named in the IA: a subject-access export for the *user* (the
 *  organization backup is not one) and account deletion. Both are actions
 *  with no endpoint. The "open folder" control needs a Tauri opener plugin
 *  the shell does not carry yet; until then the path can be copied. */

import { Badge, Banner, Button, Card, CopyButton, ErrorState, List, PageHeader, Skeleton, Table, type TableColumn } from "@henrioutai/ui";

import { useAcceptLegalText, useLegalDocuments, useOnboardingStatus, usePrivacyRegister } from "../hooks/queries";
import { t, type Lang } from "../lib/translations";
import type { DataSetResponse } from "../types";

export interface DataPrivacyPanelProps {
  lang?: Lang;
  title?: string;
  /** Where "Backup & restore" goes. Omitted = the button is not rendered. */
  onOpenBackup?: () => void;
}

const FOLDERS = [
  { name: "billgen.db", key: "data.folder.db" },
  { name: "invoices/", key: "data.folder.invoices" },
  { name: "contracts/", key: "data.folder.contracts" },
  { name: "backups/", key: "data.folder.backups" },
] as const;

export function DataPrivacyPanel({ lang = "en", title, onOpenBackup }: DataPrivacyPanelProps) {
  const onboarding = useOnboardingStatus();
  const register = usePrivacyRegister();
  const documents = useLegalDocuments();
  const accept = useAcceptLegalText();

  const heading = title ?? t(lang, "data.title");
  const dataDirectory = onboarding.data?.data_directory ?? null;
  const accepted = new Map((onboarding.data?.required_texts ?? []).map((text) => [text.key, text.accepted]));

  const columns: TableColumn<DataSetResponse>[] = [
    { key: "label", label: t(lang, "data.col.dataset"), render: (row) => row.label },
    { key: "purpose", label: t(lang, "data.col.purpose"), render: (row) => row.purpose },
    { key: "basis", label: t(lang, "data.col.basis"), render: (row) => row.basis },
    { key: "retention", label: t(lang, "data.col.retention"), render: (row) => row.retention },
  ];

  return (
    <div className="bg-stack">
      <PageHeader title={heading} subtitle={t(lang, "settings.desc.privacy")} />

      <Card title={t(lang, "data.where")}>
        {onboarding.isLoading ? (
          <Skeleton lines={3} />
        ) : dataDirectory ? (
          <div className="bg-stack">
            <p className="bg-muted">{t(lang, "data.whereHint")}</p>
            <div className="bg-path">
              <span>{dataDirectory}</span>
              <CopyButton value={dataDirectory} label={t(lang, "data.copyPath")} />
            </div>
            <dl className="bg-folder-list">
              {FOLDERS.map((folder) => (
                <div key={folder.name} style={{ display: "contents" }}>
                  <dt>{folder.name}</dt>
                  <dd>{t(lang, folder.key)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="bg-muted">{t(lang, "data.hosted")}</p>
        )}
      </Card>

      <Card title={t(lang, "data.retention")} padded={false}>
        <div className="bg-report__skeleton">
          <p className="bg-muted">{t(lang, "data.retentionHint")}</p>
        </div>
        {register.isError ? (
          <div className="bg-report__skeleton">
            <ErrorState title={t(lang, "common.error")} onRetry={() => void register.refetch()} retryLabel={t(lang, "common.retry")} />
          </div>
        ) : register.isLoading || !register.data ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={5} />
          </div>
        ) : (
          <>
            <Table columns={columns} rows={register.data.datasets} rowKey={(row) => row.key} />
            <div className="bg-report__skeleton bg-stack">
              <div>
                <strong>{t(lang, "data.retained")}</strong>
                <ul>
                  {register.data.retained_on_erasure.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>{t(lang, "data.subprocessors")}</strong>
                {register.data.subprocessors.filter((entry) => entry.in_use).length === 0 ? (
                  <p className="bg-muted">{t(lang, "data.noSubprocessors")}</p>
                ) : (
                  <ul>
                    {register.data.subprocessors
                      .filter((entry) => entry.in_use)
                      .map((entry) => (
                        <li key={entry.name}>
                          {entry.name} — {entry.purpose} ({entry.location})
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      <Card title={t(lang, "data.texts")} padded={false}>
        <div className="bg-report__skeleton">
          <p className="bg-muted">{t(lang, "data.textsHint")}</p>
        </div>
        {documents.isLoading || !documents.data ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={4} />
          </div>
        ) : (
          <List
            items={documents.data.map((doc) => {
              const isAccepted = accepted.get(doc.key) === true;
              const awaiting = doc.drafted && doc.requires_acceptance && !isAccepted;
              return {
                key: doc.key,
                primary: doc.title,
                secondary: doc.version ? `v${doc.version}` : undefined,
                trailing: !doc.drafted ? (
                  <Badge tone="neutral">{t(lang, "data.textUndrafted")}</Badge>
                ) : isAccepted ? (
                  <Badge tone="success">{t(lang, "onboarding.legal.accepted")}</Badge>
                ) : awaiting ? (
                  <Button size="sm" variant="primary" disabled={accept.isPending} onClick={() => accept.mutate({ key: doc.key, source: "settings" })}>
                    {t(lang, "onboarding.legal.accept")}
                  </Button>
                ) : undefined,
              };
            })}
          />
        )}
        {accept.isError ? (
          <div className="bg-report__skeleton">
            <Banner tone="danger">{t(lang, "common.error")}</Banner>
          </div>
        ) : null}
      </Card>

      <Card title={t(lang, "data.backupTitle")}>
        <div className="bg-stack">
          <p className="bg-muted">{t(lang, "data.backupHint")}</p>
          {onOpenBackup ? (
            <div>
              <Button variant="secondary" onClick={onOpenBackup}>
                {t(lang, "settings.label.backup")}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
