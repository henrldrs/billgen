import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { HelpIcon } from './icons/HelpIcon';
import { IconButton } from './IconButton';

export interface HelpBubbleProps {
  title?: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

export function HelpBubble({ title, children, align = 'end', className }: HelpBubbleProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const classes = ['bg-help-bubble', className].filter(Boolean).join(' ');
  const popupClasses = [
    'bg-help-bubble__popup',
    `bg-help-bubble__popup--align-${align}`,
  ].join(' ');

  return (
    <div ref={rootRef} className={classes}>
      <IconButton
        aria-label="Aide contextuelle"
        size="sm"
        onClick={() => setOpen((v) => !v)}
      >
        <HelpIcon />
      </IconButton>
      {open ? (
        <div role="tooltip" className={popupClasses}>
          {title ? <strong className="bg-help-bubble__title">{title}</strong> : null}
          <div className="bg-help-bubble__body">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
