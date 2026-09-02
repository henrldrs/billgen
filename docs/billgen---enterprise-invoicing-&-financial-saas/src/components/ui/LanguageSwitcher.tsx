import { Segmented } from './Segmented';

export interface LanguageOption {
  code: string;
  label?: string;
}

export interface LanguageSwitcherProps {
  languages?: LanguageOption[];
  value: string;
  onChange: (code: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function LanguageSwitcher({
  languages = [
    { code: 'fr', label: 'FR' },
    { code: 'nl', label: 'NL' },
    { code: 'en', label: 'EN' },
  ],
  value,
  onChange,
  size = 'sm',
  className,
}: LanguageSwitcherProps) {
  return (
    <Segmented
      ariaLabel="Langue"
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
