import type { ReactNode } from 'react';
import { Menu, type MenuItem } from './Menu';

export interface Organization {
  key: string;
  name: string;
  plan?: string;
  bceNumber?: string;
  icon?: ReactNode;
}

export interface OrgSwitcherProps {
  organizations: Organization[];
  activeKey: string;
  onChange: (key: string) => void;
  onAddOrg?: () => void;
  className?: string;
}

export function OrgSwitcher({
  organizations,
  activeKey,
  onChange,
  onAddOrg,
  className,
}: OrgSwitcherProps) {
  const active = organizations.find((o) => o.key === activeKey) ?? organizations[0];

  const trigger = (
    <button type="button" className="bg-org-switcher__trigger" aria-label={`Organisation courante : ${active?.name}`}>
      <span className="bg-org-switcher__badge">
        {active?.name ? active.name.slice(0, 2).toUpperCase() : 'BG'}
      </span>
      <span className="bg-org-switcher__label">{active?.name ?? 'Organisation'}</span>
      <svg className="bg-org-switcher__caret" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const items: MenuItem[] = [
    ...organizations.map((org) => ({
      key: org.key,
      label: (
        <span className="bg-org-switcher__item">
          <span>{org.name}</span>
          {org.plan ? <span className="bg-badge bg-badge--tone-neutral bg-num">{org.plan}</span> : null}
        </span>
      ),
      icon: (
        <span className="bg-org-switcher__item-icon">
          {org.key === activeKey ? '✓' : ''}
        </span>
      ),
      onClick: () => onChange(org.key),
    })),
    ...(onAddOrg
      ? [
          {
            key: '__add_org',
            label: '+ Ajouter une entreprise',
            dividerBefore: true,
            onClick: onAddOrg,
          },
        ]
      : []),
  ];

  return (
    <Menu
      trigger={trigger}
      items={items}
      align="start"
      className={['bg-org-switcher', className].filter(Boolean).join(' ')}
    />
  );
}
