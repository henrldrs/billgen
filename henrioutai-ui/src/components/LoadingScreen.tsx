import { LogoMark } from "./LogoMark";

export interface LoadingScreenProps {
  label?: string;
  className?: string;
}

const SHEET_COUNT = 4;

/** Full-page/panel transition state — the logo "printing" invoices. */
export function LoadingScreen({ label = "Loading…", className }: LoadingScreenProps) {
  const classes = ["bg-loading-screen", className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-live="polite">
      <div className="bg-loading-screen__stage">
        <div className="bg-loading-screen__mark">
          <LogoMark size={40} />
        </div>
        {Array.from({ length: SHEET_COUNT }).map((_, i) => (
          <span
            key={i}
            className="bg-loading-screen__sheet"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}
      </div>
      <p className="bg-loading-screen__label">{label}</p>
    </div>
  );
}
