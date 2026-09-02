import { useEffect, useRef, useState } from 'react';
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { Kbd } from './Kbd';

export interface CommandItem {
  id: string;
  label: string;
  category?: string;
  shortcut?: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands?: CommandItem[];
  placeholder?: string;
  emptyText?: string;
}

export function CommandPalette({
  open,
  onClose,
  commands = [],
  placeholder = 'Taper une commande ou rechercher...',
  emptyText = 'Aucun résultat trouvé.',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase()) ||
    (c.category && c.category.toLowerCase().includes(query.trim().toLowerCase()))
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) {
        filtered[highlight].onSelect();
        onClose();
      }
    }
  };

  return (
    <div className="bg-command-palette__backdrop" onClick={onClose}>
      <div className="bg-command-palette" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="bg-command-palette__search">
          <span className="bg-command-palette__icon"><SearchIcon /></span>
          <input
            ref={inputRef}
            type="text"
            className="bg-command-palette__input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
          />
          <Kbd keys={['ESC']} />
        </div>
        <div className="bg-command-palette__list">
          {filtered.length === 0 ? (
            <div className="bg-command-palette__empty">{emptyText}</div>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                className={[
                  'bg-command-palette__item',
                  idx === highlight ? 'bg-command-palette__item--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  cmd.onSelect();
                  onClose();
                }}
                onMouseEnter={() => setHighlight(idx)}
              >
                {cmd.icon ? <span className="bg-command-palette__item-icon">{cmd.icon}</span> : null}
                <div className="bg-command-palette__item-info">
                  <span className="bg-command-palette__item-label">{cmd.label}</span>
                  {cmd.category ? (
                    <span className="bg-command-palette__item-category">{cmd.category}</span>
                  ) : null}
                </div>
                {cmd.shortcut ? <Kbd keys={[cmd.shortcut]} /> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
