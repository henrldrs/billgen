import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fromISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const display = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Sélectionner une date',
  disabled,
  invalid,
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = value ? fromISO(value) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return () => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  const openPopup = () => {
    if (disabled) return;
    const base = value ? fromISO(value) : new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const inBounds = (iso: string) => (!min || iso >= min) && (!max || iso <= max);

  const pick = (iso: string) => {
    onChange(iso);
    close();
  };

  const shiftMonth = (delta: number) =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const todayISO = toISO(new Date());
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthLabel = viewMonth.toLocaleDateString('fr-BE', {
    month: 'long',
    year: 'numeric',
  });

  const classes = ['bg-datepicker', className].filter(Boolean).join(' ');
  const triggerClasses = [
    'bg-field__input',
    'bg-datepicker__trigger',
    invalid ? 'bg-field__input--invalid' : '',
    !value ? 'bg-datepicker__trigger--empty' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={classes}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={triggerClasses}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openPopup())}
      >
        {value ? <span className="bg-num">{display(value)}</span> : placeholder}
        <span className="bg-datepicker__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div role="dialog" aria-label="Choisir date" className="bg-datepicker__popup">
          <div className="bg-datepicker__header">
            <button type="button" className="bg-datepicker__nav" aria-label="Mois précédent" onClick={() => shiftMonth(-1)}>
              <svg viewBox="0 0 12 12"><path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="bg-datepicker__month">{monthLabel}</span>
            <button type="button" className="bg-datepicker__nav" aria-label="Mois suivant" onClick={() => shiftMonth(1)}>
              <svg viewBox="0 0 12 12"><path d="M4.5 2.5 8 6 4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="bg-datepicker__weekdays" aria-hidden="true">
            {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div ref={gridRef} className="bg-datepicker__grid">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const iso = toISO(new Date(year, month, i + 1));
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    'bg-datepicker__day',
                    'bg-num',
                    isSelected ? 'bg-datepicker__day--selected' : '',
                    isToday ? 'bg-datepicker__day--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!inBounds(iso)}
                  aria-pressed={isSelected}
                  onClick={() => pick(iso)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="bg-datepicker__footer">
            <button
              type="button"
              className="bg-datepicker__footer-action"
              disabled={!inBounds(todayISO)}
              onClick={() => pick(todayISO)}
            >
              Aujourd’hui
            </button>
            {value ? (
              <button
                type="button"
                className="bg-datepicker__footer-action"
                onClick={() => {
                  onChange(null);
                  close();
                }}
              >
                Effacer
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
