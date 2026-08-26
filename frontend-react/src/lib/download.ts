/** Saving a fetched document blob to disk.
 *
 *  Three panels download invoice PDFs, Peppol XML and credit notes, and each
 *  had grown its own copy of this — one of them without the save-as dialog.
 *  It lives here so the desktop shell's "where do you want this?" behaviour is
 *  the same wherever a document is exported from.
 */

/** Minimal typing for the File System Access API save dialog. */
type SaveFilePicker = (options: {
  suggestedName?: string;
}) => Promise<{
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
}>;

/** Classic downloads-folder anchor — no dialog, no cancel. */
function saveBlobViaAnchor(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Save a document blob, letting the user pick the destination where the
 *  browser supports it (Chromium/WebView2); otherwise fall back to the anchor.
 *  Returns false when the user cancelled the dialog. */
export async function saveBlob(blob: Blob, filename: string): Promise<boolean> {
  const picker = (window as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return false;
      // Picker unavailable in this context (e.g. sandboxed iframe) — fall back.
    }
  }
  saveBlobViaAnchor(blob, filename);
  return true;
}

/** A reference like "ACME-2026/0007" is not a legal filename on Windows. */
export function documentFilename(reference: string, extension: string): string {
  return `${reference.replace(/[/\\:*?"<>|]/g, "-")}.${extension}`;
}
