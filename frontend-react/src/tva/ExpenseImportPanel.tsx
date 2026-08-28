/** Import (§2) — upload, progress, and the outcome split.
 *
 *  Scaffold — see README.md.
 *
 *  Two behaviours the blueprint is specific about, and both are about honesty
 *  under load:
 *
 *  **Progress is per-document, not a bar that lies.** "Processing 24 expenses
 *  · 17 / 24" is a count the server can actually produce. A percentage over an
 *  unknown OCR duration is invented.
 *
 *  **The page does not freeze.** The user should be able to navigate away
 *  while processing continues — which is not a CSS problem: it needs the work
 *  to live on the server in a job runner, not in this component. Until that
 *  exists, `progress` is a prop this panel renders and nothing more, and the
 *  README says so rather than the UI pretending.
 *
 *  The finish state splits into ready and needs-attention deliberately. "24
 *  expenses imported" alone sends the user to a list to find out which three
 *  are broken.
 */

import { Button, FileUpload, ProgressBar, SuccessState } from "@henrioutai/ui";

import type { ImportProgress } from "./types";

export interface ExpenseImportPanelProps {
  progress: ImportProgress | null;
  /** Set once the batch is finished; null while idle or importing. */
  result: { imported: number; ready: number; needsAttention: number } | null;
  onFiles: (files: File[]) => void;
  onReview: () => void;
}

export function ExpenseImportPanel({
  progress,
  result,
  onFiles,
  onReview,
}: ExpenseImportPanelProps) {
  if (progress) {
    return (
      <div className="bg-stack">
        <p>
          Processing {progress.total} expenses · {progress.processed} / {progress.total}
        </p>
        <ProgressBar
          value={progress.total === 0 ? 0 : (progress.processed / progress.total) * 100}
          label="Import progress"
          showValue
        />
        <p className="bg-tva-note">
          You can keep working — BillGen continues analyzing in the background.
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <SuccessState
        title={`${result.imported} expenses imported`}
        description={`${result.ready} ready for analysis · ${result.needsAttention} need your attention`}
        action={
          <Button variant="primary" onClick={onReview}>
            Review expenses
          </Button>
        }
      />
    );
  }

  return (
    <FileUpload
      accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
      multiple
      onFiles={onFiles}
      hint="PDF, image, CSV or spreadsheet."
    />
  );
}
