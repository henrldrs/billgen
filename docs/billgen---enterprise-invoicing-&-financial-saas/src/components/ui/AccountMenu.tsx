import type { ReactNode } from 'react';
import { Menu, type MenuItem } from './Menu';
import { IconChip } from './icons/IconChip';

export interface AccountMenuProps {
  name: string;
  email: string;
  avatarUrl?: string;
  initials?: string;
  badge?: ReactNode;
  items: MenuItem[];
  className?: string;
}

export function AccountMenu({
  name,
  email,
  initials,
  badge,
  items,
  className,
}: AccountMenuProps) {
  const trigger = (
    <button type="button" className="bg-account-trigger" aria-label={`Compte : ${name}`}>
      <IconChip tone="accent" shape="circle" size="md">
        <span className="bg-topnav__avatar-initials">{initials ?? name.slice(0, 2).toUpperCase()}</span>
      </IconChip>
    </button>
  );

  const headerItem: MenuItem = {
    key: '__header',
    disabled: true,
    label: (
      <div className="bg-account-menu__header">
        <div className="bg-account-menu__name">
          <span>{name}</span>
          {badge}
        </div>
        <div className="bg-account-menu__email">{email}</div>
      </div>
    ),
  };

  return (
    <Menu
      trigger={trigger}
      items={[headerItem, ...items]}
      align="end"
      className={['bg-account-menu', className].filter(Boolean).join(' ')}
    />
  );
}
