import type { ReactNode } from 'react';

export interface SettingsShellNavSection {
  title?: ReactNode;
  items: {
    key: string;
    label: ReactNode;
    icon?: ReactNode;
    badge?: ReactNode;
  }[];
}

export interface SettingsShellProps {
  sections: SettingsShellNavSection[];
  activeKey: string;
  onSelectKey: (key: string) => void;
  children: ReactNode;
  className?: string;
}

export function SettingsShell({
  sections,
  activeKey,
  onSelectKey,
  children,
  className,
}: SettingsShellProps) {
  const classes = ['bg-settings-shell', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <aside className="bg-settings-shell__sidebar">
        <nav className="bg-settings-shell__nav">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="bg-settings-shell__section">
              {section.title ? (
                <div className="bg-settings-shell__section-title">{section.title}</div>
              ) : null}
              <ul className="bg-settings-shell__items">
                {section.items.map((item) => {
                  const active = item.key === activeKey;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        className={[
                          'bg-settings-shell__item',
                          active ? 'bg-settings-shell__item--active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSelectKey(item.key)}
                      >
                        {item.icon ? (
                          <span className="bg-settings-shell__item-icon">{item.icon}</span>
                        ) : null}
                        <span className="bg-settings-shell__item-label">{item.label}</span>
                        {item.badge}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <section className="bg-settings-shell__content">{children}</section>
    </div>
  );
}
