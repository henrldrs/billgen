import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  dividerBefore?: boolean;
}

export interface MenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  className?: string;
}

export function Menu({ trigger, items, align = 'end', className }: MenuProps) {
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

  const classes = ['bg-menu', className].filter(Boolean).join(' ');
  const popupClasses = ['bg-menu__popup', `bg-menu__popup--align-${align}`].join(' ');

  return (
    <div ref={rootRef} className={classes}>
      <div
        className="bg-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      {open ? (
        <ul role="menu" className={popupClasses}>
          {items.map((item) => (
            <li key={item.key} role="none">
              {item.dividerBefore ? <div className="bg-menu__divider" /> : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={[
                  'bg-menu__item',
                  item.danger ? 'bg-menu__item--danger' : '',
                  item.disabled ? 'bg-menu__item--disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.icon ? <span className="bg-menu__icon">{item.icon}</span> : null}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
