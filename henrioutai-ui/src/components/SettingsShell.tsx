import type { ReactNode } from "react";

export interface SettingsSection {
  key: string;
  label: string;
  /** Optional leading icon — sized by CSS. */
  icon?: ReactNode;
  /** Small print under the label in the rail. */
  description?: string;
}

export interface SettingsShellProps {
  sections: SettingsSection[];
  activeKey: string;
  onSectionChange: (key: string) => void;
  /** Content of the active section — the caller switches on activeKey. */
  children: ReactNode;
  className?: string;
}

/**
 * Consistent layout for grouped settings: a section rail on the left, the
 * active section's content on the right (stacks on narrow screens). In
 * BillGen this hosts Company details — including Import data and Activity
 * log, which live in settings rather than the primary nav.
 */
export function SettingsShell({
  sections,
  activeKey,
  onSectionChange,
  children,
  className,
}: SettingsShellProps) {
  const classes = ["bg-settings", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <nav className="bg-settings__rail" aria-label="Settings sections">
        {sections.map((section) => {
          const active = section.key === activeKey;
          return (
            <button
              key={section.key}
              type="button"
              aria-current={active ? "true" : undefined}
              className={[
                "bg-settings__section",
                active ? "bg-settings__section--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSectionChange(section.key)}
            >
              {section.icon ? (
                <span className="bg-settings__icon">{section.icon}</span>
              ) : null}
              <span className="bg-settings__text">
                <span className="bg-settings__label">{section.label}</span>
                {section.description ? (
                  <span className="bg-settings__desc">{section.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="bg-settings__content">{children}</div>
    </div>
  );
}
