import { Menu, type MenuEntry } from "./Menu";
import { IconChip } from "./icons/IconChip";

export interface AccountMenuProps {
  name: string;
  email?: string;
  initials: string;
  /** Menu entries below the identity header — the app decides (profile,
   * company settings, language, sign out…); sign out should be `danger`. */
  items: MenuEntry[];
  className?: string;
}

/**
 * Avatar-triggered account dropdown: identity header (name + email) over the
 * app's account actions. Drop it into TopNav's `accountSlot`.
 */
export function AccountMenu({ name, email, initials, items, className }: AccountMenuProps) {
  return (
    <Menu
      className={className}
      align="end"
      triggerAriaLabel="Account"
      triggerClassName="bg-account-menu__trigger"
      trigger={
        <IconChip tone="accent" shape="circle" size="md">
          <span className="bg-topnav__avatar-initials">{initials}</span>
        </IconChip>
      }
      header={
        <div className="bg-account-menu__id">
          <span className="bg-account-menu__name">{name}</span>
          {email ? <span className="bg-account-menu__email">{email}</span> : null}
        </div>
      }
      items={items}
    />
  );
}
