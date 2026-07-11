import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IconChip } from "./icons/IconChip";
import { NotificationsIcon } from "./icons/NotificationsIcon";

export interface NotificationItem {
  key: string;
  title: ReactNode;
  description?: ReactNode;
  /** Preformatted, e.g. "2 min ago" or "28/06 14:32" — rendered in mono. */
  timestamp?: string;
  unread?: boolean;
  tone?: "neutral" | "success" | "danger";
  onClick?: () => void;
}

export interface NotificationCenterProps {
  notifications: NotificationItem[];
  /** Renders the "Mark all read" header action when provided. */
  onMarkAllRead?: () => void;
  emptyText?: string;
  className?: string;
}

/**
 * Bell trigger + overlay-glass panel listing notifications. The unread dot
 * on the bell mirrors the list; clicking an entry runs its onClick and
 * closes. State (read/unread, the list itself) belongs to the app.
 */
export function NotificationCenter({
  notifications,
  onMarkAllRead,
  emptyText = "You're all caught up.",
  className,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const classes = ["bg-notifs", className].filter(Boolean).join(" ");
  return (
    <div ref={rootRef} className={classes}>
      <button
        type="button"
        className="bg-icon-button bg-notifs__trigger"
        aria-label={
          unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconChip tone="neutral" size="md">
          <NotificationsIcon />
        </IconChip>
        {unreadCount > 0 ? <span className="bg-icon-chip__dot" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="Notifications" className="bg-notifs__panel">
          <div className="bg-notifs__header">
            <span className="bg-notifs__title">Notifications</span>
            {onMarkAllRead && unreadCount > 0 ? (
              <button
                type="button"
                className="bg-notifs__mark-read"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {notifications.length === 0 ? (
            <div className="bg-notifs__empty">{emptyText}</div>
          ) : (
            <ul className="bg-notifs__list">
              {notifications.map((n) => {
                const content = (
                  <>
                    <span
                      className={`bg-notifs__dot bg-notifs__dot--${n.tone ?? "neutral"}${n.unread ? " bg-notifs__dot--unread" : ""}`}
                      aria-hidden="true"
                    />
                    <span className="bg-notifs__text">
                      <span className="bg-notifs__item-head">
                        <span className={`bg-notifs__item-title${n.unread ? " bg-notifs__item-title--unread" : ""}`}>
                          {n.title}
                        </span>
                        {n.timestamp ? (
                          <span className="bg-notifs__time bg-num">{n.timestamp}</span>
                        ) : null}
                      </span>
                      {n.description ? (
                        <span className="bg-notifs__item-desc">{n.description}</span>
                      ) : null}
                    </span>
                  </>
                );
                return (
                  <li key={n.key}>
                    {n.onClick ? (
                      <button
                        type="button"
                        className="bg-notifs__item bg-notifs__item--clickable"
                        onClick={() => {
                          setOpen(false);
                          n.onClick?.();
                        }}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="bg-notifs__item">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
