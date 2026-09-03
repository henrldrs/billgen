import { useEffect, useState, type ReactNode } from "react";
import { HomeButton } from "./HomeButton";
import { Menu, type MenuEntry } from "./Menu";
import { IconButton } from "./IconButton";
import { CreateBillButton } from "./CreateBillButton";
import { IconChip } from "./icons/IconChip";
import { SearchIcon } from "./icons/SearchIcon";
import { NotificationsIcon } from "./icons/NotificationsIcon";

/** One sub-page inside a primary nav item's popup. */
export interface TopNavSubItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  /** Right-aligned slot — a count, or a marker for unfinished destinations. */
  hint?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface TopNavLink {
  key: string;
  /** Rendered as-is, so a link may carry a trailing marker beside its text. */
  label: ReactNode;
  /** Optional leading icon — pass one of the icons/ components, sized by CSS. */
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  /**
   * Sub-pages of this section. When present the link becomes a popup trigger
   * instead of a plain button, so the whole section is reachable in one hop
   * without a sidebar. Put the section's own landing page in the list too —
   * the trigger opens the menu rather than navigating.
   */
  items?: TopNavSubItem[];
}

export interface TopNavProps {
  title: string;
  subtitle?: string;
  /**
   * Primary navigation, rendered as a second row under the title/actions row.
   * This is what a sidebar would otherwise carry — pass the app's full nav
   * item list here instead of maintaining a separate sidebar (see README).
   */
  links?: TopNavLink[];
  onNavigateHome?: () => void;
  onCreateBill?: () => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onAvatarClick?: () => void;
  notificationCount?: number;
  avatarInitials?: string;
  /** Custom account trigger (e.g. <AccountMenu …>) — replaces avatarInitials. */
  accountSlot?: ReactNode;
  /**
   * Surface treatment: `solid` (default) is the gradient header; `translucent`
   * and `glass` blur whatever scrolls underneath — use those when the header
   * floats over page content.
   */
  /**
   * `floating` detaches the bar from the window edges: a rounded glass panel
   * with the ground visible around it, opaque at rest and going translucent
   * once the page is scrolled under it.
   *
   * The rest-state opacity is the point rather than an optimisation. A bar
   * that is translucent over the top of a page is translucent over nothing —
   * it just looks washed out — and the effect only means anything once there
   * is content passing beneath it. So the translucency is the *scrolled*
   * state, which is also when a person can see that it is floating.
   */
  variant?: "solid" | "translucent" | "glass" | "floating";
  /** Extra controls rendered after the title block, before the action cluster. */
  children?: ReactNode;
  className?: string;
}

/**
 * Global header: logo/home, page title, primary nav links, search,
 * notifications, create-bill CTA, account avatar. Presentational only — no
 * data fetching, no router import. With `links` supplied, this replaces a
 * separate sidebar rather than sitting alongside one.
 */
export function TopNav({
  title,
  subtitle,
  links = [],
  onNavigateHome,
  onCreateBill,
  onSearchClick,
  onNotificationsClick,
  onAvatarClick,
  notificationCount = 0,
  avatarInitials,
  accountSlot,
  variant = "solid",
  children,
  className,
}: TopNavProps) {
  /* Only the floating variant listens. Attaching a scroll handler for a bar
     that cannot react to it is a listener on every scroll frame for nothing. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (variant !== "floating") return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // a reload part-way down a page starts scrolled
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);
  const classes = [
    "bg-topnav",
    variant !== "solid" ? `bg-topnav--${variant}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <header className={classes} data-scrolled={scrolled ? "true" : undefined}>
      <div className="bg-topnav__row">
        <HomeButton onNavigateHome={onNavigateHome} size="md" />

        <div className="bg-topnav__titles">
          <h1 className="bg-topnav__title">{title}</h1>
          {subtitle ? <p className="bg-topnav__subtitle">{subtitle}</p> : null}
        </div>

        {children}

        <div className="bg-topnav__actions">
          <IconButton aria-label="Search" onClick={onSearchClick}>
            <SearchIcon />
          </IconButton>
          <IconButton
            aria-label="Notifications"
            onClick={onNotificationsClick}
            dot={notificationCount > 0}
          >
            <NotificationsIcon />
          </IconButton>
          <CreateBillButton onClick={onCreateBill} />
          {accountSlot ? (
            <div className="bg-topnav__account">{accountSlot}</div>
          ) : avatarInitials ? (
            <button type="button" className="bg-topnav__avatar" onClick={onAvatarClick} aria-label="Account">
              <IconChip tone="accent" shape="circle" size="md">
                <span className="bg-topnav__avatar-initials">{avatarInitials}</span>
              </IconChip>
            </button>
          ) : null}
        </div>
      </div>

      {links.length > 0 ? (
        <nav className="bg-topnav__links" aria-label="Primary">
          {links.map((link) => {
            const linkClasses = [
              "bg-topnav__link",
              link.active ? "bg-topnav__link--active" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const content = (
              <>
                {link.icon}
                {link.label}
              </>
            );
            if (link.items?.length) {
              const entries: MenuEntry[] = link.items.map((item) => ({
                key: item.key,
                label: item.label,
                icon: item.icon,
                hint: item.hint,
                disabled: item.disabled,
                onSelect: item.onSelect,
              }));
              return (
                <Menu
                  key={link.key}
                  trigger={content}
                  triggerClassName={linkClasses}
                  items={entries}
                  align="start"
                />
              );
            }
            return link.href ? (
              <a key={link.key} href={link.href} className={linkClasses} onClick={link.onClick}>
                {content}
              </a>
            ) : (
              <button key={link.key} type="button" className={linkClasses} onClick={link.onClick}>
                {content}
              </button>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
