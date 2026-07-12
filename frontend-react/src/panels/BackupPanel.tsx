/** Organization backup & restore (ADR-0003).
 *  Download: fetches /backup/export and saves it as a timestamped .json.
 *  Restore: pick file -> confirm dialog -> POST /backup/restore. The server
 *  refuses (409) unless the organization is still empty; the raw detail
 *  message is surfaced so the user sees why. */

import { useState } from "react";

import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Spinner } from "../components/Spinner";
import { useBackupExport, useBackupRestore } from "../hooks/queries";
import { ApiError } from "../lib/apiClient";
import { t, type Lang } from "../lib/translations";

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

function backupFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `billgen-backup-${stamp}.json`;
}

export function BackupPanel({ lang = "en" }: BackupPanelProps) {
  const [backup, setBackup] = useState<unknown | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const exportBackup = useBackupExport();
  const restore = useBackupRestore();

  const onDownload = () => {
    exportBackup.mutate(undefined, {
      onSuccess: (payload) => saveJson(payload, backupFilename()),
    });
  };

  const onFile = async (file: File | undefined) => {
    restore.reset();
    setFileError(null);
    if (!file) return;
    try {
      const parsed = JSON.parse(await readText(file));
      setBackup(parsed);
      setFileName(file.name);
    } catch {
      setBackup(null);
      setFileName(file.name);
      setFileError(t(lang, "backup.badFile"));
    }
  };

  const busy = exportBackup.isPending || restore.isPending;
  const serverError = restore.error ?? exportBackup.error;

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
        <h2>{t(lang, "backup.restoreHeading")}</h2>
      </header>
      <p className="bg-import__intro">{t(lang, "backup.restoreIntro")}</p>

      <label className="bg-import__file">
        <span className="bg-button bg-button--secondary">{t(lang, "backup.choose")}</span>
        <input
          type="file"
          accept="application/json,.json"
          className="bg-import__input"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {fileName ? <span className="bg-import__filename">{fileName}</span> : null}
      </label>

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
          disabled={backup == null || busy || restore.isSuccess}
        >
          {t(lang, "backup.restore")}
        </Button>
      </div>

      {busy ? <Spinner label={t(lang, "common.loading")} /> : null}

      {restore.isSuccess ? (
        <div className="bg-import__report">
          <h2>{t(lang, "backup.done")}</h2>
          <ul>
            {Object.entries(restore.data)
              .filter(([, count]) => count > 0)
              .map(([entity, count]) => (
                <li key={entity}>
                  {entity.replace("_", " ")}: {count} {t(lang, "backup.restored")}
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
          if (backup != null) restore.mutate(backup);
        }}
        onCancel={() => setConfirmOpen(false)}
      >
        {t(lang, "backup.confirmBody")}
      </ConfirmDialog>
    </section>
  );
}
