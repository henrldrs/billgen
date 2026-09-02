import { useState } from 'react';

export interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  copiedLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function CopyButton({
  textToCopy,
  label = 'Copier',
  copiedLabel = 'Copié !',
  size = 'sm',
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      type="button"
      className={['bg-copy-btn', `bg-copy-btn--${size}`, copied ? 'is-copied' : '', className]
        .filter(Boolean)
        .join(' ')}
      onClick={handleCopy}
      title={textToCopy}
    >
      <span className="bg-copy-btn__icon">
        {copied ? (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8.5L6.5 12L13 4" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="9" height="9" rx="1.5" /><path d="M3 11V3a1 1 0 0 1 1-1h8" /></svg>
        )}
      </span>
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
