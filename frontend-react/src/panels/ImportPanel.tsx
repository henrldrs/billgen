/** Import companies/clients/products from a FinanceFlow BillGen backup (.json).
 *  Flow: pick file -> preview (dry run, writes nothing) -> confirm (commit).
 *  All parsing/mapping happens on the server; this panel only ships the JSON. */

import { useState } from "react";

import { Button, Spinner } from "@henrioutai/ui";
import { useImportCommit, useImportPreview } from "../hooks/queries";
import { t, type Lang } from "../lib/translations";
import type { ImportEntityCounts, ImportReport } from "../types";

export interface ImportPanelProps {
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

const ZERO: Required<ImportEntityCounts> = { created: 0, skipped: 0, failed: 0 };

function counts(value: ImportEntityCounts | undefined): Required<ImportEntityCounts> {
  return { ...ZERO, ...value };
}

function ReportView({ report, lang }: { report: ImportReport; lang: Lang }) {
  const rows: [string, ImportEntityCounts | undefined][] = [
    [t(lang, "import.companies"), report.companies],
    [t(lang, "import.clients"), report.clients],
    [t(lang, "import.products"), report.products],
  ];

  return (
    <div className="bg-import__report">
      <h2>
        {report.dry_run
          ? t(lang, "import.previewHeading")
          : t(lang, "import.doneHeading")}
      </h2>

      <table className="bg-table">
        <thead>
          <tr>
            <th />
            <th>{t(lang, "import.created")}</th>
            <th>{t(lang, "import.skipped")}</th>
            <th>{t(lang, "import.failed")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => {
            const c = counts(value);
            return (
              <tr key={label}>
                <td>{label}</td>
                <td>{c.created}</td>
                <td>{c.skipped}</td>
                <td>{c.failed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {report.invoices_detected ? (
        <p className="bg-import__note">
          {report.invoices_detected} {t(lang, "import.invoicesNote")}
        </p>
      ) : null}

      {report.issues && report.issues.length > 0 ? (
        <div className="bg-import__issues">
          <h3>{t(lang, "import.issues")}</h3>
          <ul>
            {report.issues.map((issue, i) => (
              <li key={`${issue.entity}-${issue.name}-${i}`}>
                <strong>{issue.entity}</strong> · {issue.name} — {issue.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ImportPanel({ lang = "en" }: ImportPanelProps) {
  const [backup, setBackup] = useState<unknown | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const preview = useImportPreview();
  const commit = useImportCommit();

  const reset = () => {
    setBackup(null);
    setFileName(null);
    setFileError(null);
    preview.reset();
    commit.reset();
  };

  const onFile = async (file: File | undefined) => {
    preview.reset();
    commit.reset();
    setFileError(null);
    if (!file) return;
    try {
      const parsed = JSON.parse(await readText(file));
      setBackup(parsed);
      setFileName(file.name);
    } catch {
      setBackup(null);
      setFileName(file.name);
      setFileError(t(lang, "import.badFile"));
    }
  };

  const busy = preview.isPending || commit.isPending;
  const serverError = commit.error ?? preview.error;

  return (
    <section className="bg-panel bg-import" aria-label={t(lang, "import.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "import.title")}</h1>
      </header>

      <p className="bg-import__intro">{t(lang, "import.intro")}</p>

      <label className="bg-import__file">
        <span className="bg-button bg-button--secondary">{t(lang, "import.choose")}</span>
        <input
          type="file"
          accept="application/json,.json"
          className="bg-import__input"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {fileName ? <span className="bg-import__filename">{fileName}</span> : null}
      </label>

      {fileError ? <p className="bg-field__error" role="alert">{fileError}</p> : null}
      {serverError ? (
        <p className="bg-field__error" role="alert">
          {serverError instanceof Error ? serverError.message : t(lang, "common.error")}
        </p>
      ) : null}

      <div className="bg-import__actions">
        <Button
          onClick={() => backup != null && preview.mutate(backup)}
          disabled={backup == null || busy}
        >
          {t(lang, "import.preview")}
        </Button>
        {preview.isSuccess && !commit.isSuccess ? (
          <Button
            variant="primary"
            onClick={() => backup != null && commit.mutate(backup)}
            disabled={busy}
          >
            {t(lang, "import.confirm")}
          </Button>
        ) : null}
        {backup != null || preview.isSuccess ? (
          <Button variant="secondary" onClick={reset} disabled={busy}>
            {t(lang, "import.reset")}
          </Button>
        ) : null}
      </div>

      {busy ? <Spinner label={t(lang, "common.loading")} /> : null}

      {commit.isSuccess ? (
        <ReportView report={commit.data} lang={lang} />
      ) : preview.isSuccess ? (
        <ReportView report={preview.data} lang={lang} />
      ) : null}
    </section>
  );
}
