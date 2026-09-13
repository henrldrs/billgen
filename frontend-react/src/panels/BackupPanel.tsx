/** Organization backup & restore (ADR-0003, T-28).
 *
 *  Three things on one screen:
 *
 *  1. **Download** — `GET /backup/export`, saved as a timestamped `.json`.
 *     Readable, and therefore the copy that stays on the machine.
 *  2. **Carry** — `POST /backup/export/encrypted`: the same JSON plus every
 *     PDF, zipped and sealed with a passphrase. The passphrase notice is the
 *     server's sentence (`GET /backup/passphrase-notice`), shown *before* the
 *     field, and the button stays dead until the person has said they read
 *     it — the API refuses without that acknowledgement, so the checkbox is
 *     not decoration, it is the request.
 *  3. **Restore** — pick a file. JSON goes to `POST /backup/restore` as it
 *     always did; anything else (`.billgenbak`, `.zip`) goes whole to
 *     `POST /backup/restore/file`, with the passphrase in a header when the
 *     archive is sealed. The server refuses (409) unless the organization is
 *     still empty; the raw detail is surfaced so the user sees why. */

import { useState } from "react";

import { Banner, Button, Checkbox, ConfirmDialog, Field, Spinner, TextInput } from "@henrioutai/ui";
import {
  useBackupExport,
  useBackupRestore,
  useBackupRestoreFile,
  usePassphraseNotice,
  useSealedBackupExport,
} from "../hooks/queries";
import { ApiError } from "../lib/apiClient";
import { saveBlob } from "../lib/download";
import { t, tf, type Lang } from "../lib/translations";

export interface BackupPanelProps {
  lang?: Lang;
}

/** Read a File as text. FileReader (not File.text()) for broad browser + jsdom
 *  support. */
function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Read a File as bytes, the same way and for the same reason. */
function readBytes(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Trigger a browser "Save as" for the backup JSON (same anchor pattern as
 *  HistoryPanel's document downloads). */
function saveJson(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function backupFilename(extension: string, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `billgen-backup-${stamp}.${extension}`;
}

/** A sealed archive announces itself by extension; a `.zip` is the unsealed
 *  carried form; anything else is tried as the plain JSON export. */
function isArchive(file: File): boolean {
  return /\.(billgenbak|zip)$/i.test(file.name);
}

export function BackupPanel({ lang = "en" }: BackupPanelProps) {
  const [backup, setBackup] = useState<unknown | null>(null);
  const [archive, setArchive] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState("");

  const [passphrase, setPassphrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [carried, setCarried] = useState<number | null>(null);

  const exportBackup = useBackupExport();
  const sealedExport = useSealedBackupExport();
  const notice = usePassphraseNotice();
  const restore = useBackupRestore();
  const restoreFile = useBackupRestoreFile();

  const onDownload = () => {
    exportBackup.mutate(undefined, {
      onSuccess: (payload) => saveJson(payload, backupFilename("json")),
    });
  };

  const minimum = notice.data?.minimum_length ?? 12;
  const canCarry = acknowledged && passphrase.length >= minimum && !sealedExport.isPending;
  const onCarry = () => {
    setCarried(null);
    sealedExport.mutate(passphrase, {
      onSuccess: async ({ blob, documents }) => {
        await saveBlob(blob, backupFilename("billgenbak"));
        setCarried(documents);
        setPassphrase("");
        setAcknowledged(false);
      },
    });
  };

  const onFile = async (file: File | undefined) => {
    restore.reset();
    restoreFile.reset();
    setFileError(null);
    setBackup(null);
    setArchive(null);
    if (!file) return;
    setFileName(file.name);
    if (isArchive(file)) {
      setArchive(file);
      return;
    }
    try {
      setBackup(JSON.parse(await readText(file)));
    } catch {
      setFileError(t(lang, "backup.badFile"));
    }
  };

  const sealed = archive != null && /\.billgenbak$/i.test(archive.name);
  const busy = exportBackup.isPending || sealedExport.isPending || restore.isPending || restoreFile.isPending;
  const serverError = restore.error ?? restoreFile.error ?? exportBackup.error ?? sealedExport.error;
  const restored = restore.isSuccess ? restore.data : restoreFile.isSuccess ? restoreFile.data : null;

  return (
    <section className="bg-panel bg-import" aria-label={t(lang, "backup.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "backup.title")}</h1>
      </header>

      <p className="bg-import__intro">{t(lang, "backup.intro")}</p>
      <div className="bg-import__actions">
        <Button onClick={onDownload} disabled={busy}>
          {t(lang, "backup.download")}
        </Button>
      </div>

      <header className="bg-panel__header">
        <h2>{t(lang, "backup.carryHeading")}</h2>
      </header>
      <p className="bg-import__intro">{t(lang, "backup.carryIntro")}</p>
      {notice.data ? (
        <Banner tone="warn">{notice.data.notice}</Banner>
      ) : null}
      <Field label={t(lang, "backup.passphrase")} hint={tf(lang, "backup.passphraseHint", { n: minimum })}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
        />
      </Field>
      <Checkbox
        label={t(lang, "backup.acknowledge")}
        checked={acknowledged}
        onChange={(event) => setAcknowledged(event.target.checked)}
      />
      <div className="bg-import__actions">
        <Button onClick={onCarry} disabled={!canCarry || busy}>
          {t(lang, "backup.carry")}
        </Button>
      </div>
      {carried !== null ? (
        <Banner tone="success" onDismiss={() => setCarried(null)}>
          {tf(lang, "backup.carryDone", { n: carried })}
        </Banner>
      ) : null}

      <header className="bg-panel__header">
        <h2>{t(lang, "backup.restoreHeading")}</h2>
      </header>
      <p className="bg-import__intro">{t(lang, "backup.restoreIntro")}</p>
      <p className="bg-import__intro">{t(lang, "backup.restoreFileHint")}</p>

      <label className="bg-import__file">
        <span className="bg-button bg-button--secondary">{t(lang, "backup.choose")}</span>
        <input
          type="file"
          accept="application/json,.json,.billgenbak,.zip"
          className="bg-import__input"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {fileName ? <span className="bg-import__filename">{fileName}</span> : null}
      </label>

      {sealed ? (
        <Field label={t(lang, "backup.restorePassphrase")}>
          <TextInput
            type="password"
            autoComplete="off"
            value={restorePassphrase}
            onChange={(event) => setRestorePassphrase(event.target.value)}
          />
        </Field>
      ) : null}

      {fileError ? (
        <p className="bg-field__error" role="alert">
          {fileError}
        </p>
      ) : null}
      {serverError ? (
        <p className="bg-field__error" role="alert">
          {serverError instanceof ApiError || serverError instanceof Error
            ? serverError.message
            : t(lang, "common.error")}
        </p>
      ) : null}

      <div className="bg-import__actions">
        <Button
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          disabled={(backup == null && archive == null) || busy || restored != null || (sealed && !restorePassphrase)}
        >
          {t(lang, "backup.restore")}
        </Button>
      </div>

      {busy ? <Spinner label={t(lang, "common.loading")} /> : null}

      {restored ? (
        <div className="bg-import__report">
          <h2>{t(lang, "backup.done")}</h2>
          <ul>
            {Object.entries(restored)
              .filter(([, count]) => typeof count === "number" && count > 0)
              .map(([entity, count]) => (
                <li key={entity}>
                  {entity.replace("_", " ")}: {count as number} {t(lang, "backup.restored")}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={t(lang, "backup.confirmTitle")}
        confirmLabel={t(lang, "backup.restore")}
        danger
        onConfirm={() => {
          setConfirmOpen(false);
          if (archive != null) {
            void readBytes(archive).then((bytes) =>
              restoreFile.mutate({ archive: bytes, passphrase: sealed ? restorePassphrase : undefined }),
            );
          } else if (backup != null) {
            restore.mutate(backup);
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      >
        {t(lang, "backup.confirmBody")}
      </ConfirmDialog>
    </section>
  );
}
