import { Segmented } from "./Segmented";

export interface LanguageOption {
  /** BCP 47-ish code — "fr", "nl", "en". */
  code: string;
  /** Short display label; defaults to the uppercased code. */
  label?: string;
}

export interface LanguageSwitcherProps {
  /** BillGen ships FR/NL first — pass exactly the locales the app supports. */
  languages: LanguageOption[];
  value: string;
  onChange: (code: string) => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Locale selector over the Segmented primitive — meant for the 2–3 locales
 * a Belgian invoicing app actually ships (FR/NL, later EN), not a country
 * dropdown. Codes render uppercase in mono for instant scanning.
 */
export function LanguageSwitcher({
  languages,
  value,
  onChange,
  size = "md",
  className,
}: LanguageSwitcherProps) {
  return (
    <Segmented
      ariaLabel="Language"
      size={size}
      className={className}
      value={value}
      onChange={onChange}
      options={languages.map((l) => ({
        value: l.code,
        label: <span className="bg-num">{l.label ?? l.code.toUpperCase()}</span>,
      }))}
    />
  );
}
