import { useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";

export interface FileUploadProps {
  /** Called with the full current list whenever it changes. */
  onFiles: (files: File[]) => void;
  /** Native accept string, e.g. ".csv,.xml". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Small print inside the dropzone ("CSV or UBL XML, max 5 MB"). */
  hint?: ReactNode;
  className?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Drag-and-drop / click-to-browse file input. Keeps its own list (chips with
 * remove buttons) and reports every change through onFiles.
 */
export function FileUpload({
  onFiles,
  accept,
  multiple = false,
  disabled,
  hint,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (next: File[]) => {
    setFiles(next);
    onFiles(next);
  };

  const add = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const added = [...incoming];
    update(multiple ? [...files, ...added] : added.slice(0, 1));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (!disabled) add(event.dataTransfer.files);
  };

  const zoneClasses = [
    "bg-upload",
    dragActive ? "bg-upload--drag" : "",
    disabled ? "bg-upload--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={zoneClasses}>
      <button
        type="button"
        className="bg-upload__zone"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <span className="bg-upload__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.5 13.5v1.75A1.75 1.75 0 0 0 5.25 17h9.5a1.75 1.75 0 0 0 1.75-1.75V13.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bg-upload__text">
          <strong>Drop {multiple ? "files" : "a file"} here</strong> or click to browse
        </span>
        {hint ? <span className="bg-upload__hint">{hint}</span> : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="bg-upload__input"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = ""; // same file can be picked again
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
      {files.length > 0 ? (
        <ul className="bg-upload__files">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="bg-upload__file">
              <span className="bg-upload__file-name">{file.name}</span>
              <span className="bg-upload__file-size bg-num">{formatSize(file.size)}</span>
              <button
                type="button"
                className="bg-upload__file-remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => update(files.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
