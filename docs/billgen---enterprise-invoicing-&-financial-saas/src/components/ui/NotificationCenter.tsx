import type { ReactNode } from 'react';
import { Drawer } from './Drawer';
import { Button } from './Button';
import { Badge } from './Badge';

export interface AppNotification {
  id: string;
  title: ReactNode;
  body: ReactNode;
  time: string;
  read?: boolean;
  tone?: 'info' | 'success' | 'warn' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  notifications?: AppNotification[];
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  className?: string;
}

export function NotificationCenter({
  open,
  onClose,
  notifications = [],
  onMarkAllAsRead,
  onClearAll,
  className,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="bg-notification-center__title">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <Badge tone="accent">
              <span className="bg-num">{unreadCount} non lues</span>
            </Badge>
          ) : null}
        </div>
      }
      footer={
        <div className="bg-notification-center__footer">
          {onMarkAllAsRead ? (
            <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
              Tout marquer comme lu
            </Button>
          ) : null}
          {onClearAll ? (
            <Button variant="plain" size="sm" onClick={onClearAll}>
              Effacer
            </Button>
          ) : null}
        </div>
      }
      className={['bg-notification-center', className].filter(Boolean).join(' ')}
    >
      {notifications.length === 0 ? (
        <div className="bg-notification-center__empty">
          <p>Aucune notification pour le moment.</p>
        </div>
      ) : (
        <ul className="bg-notification-center__list">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={[
                'bg-notification-center__item',
                !item.read ? 'bg-notification-center__item--unread' : '',
                item.tone ? `bg-notification-center__item--${item.tone}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="bg-notification-center__item-header">
                <strong className="bg-notification-center__item-title">{item.title}</strong>
                <span className="bg-notification-center__item-time bg-num">{item.time}</span>
              </div>
              <div className="bg-notification-center__item-body">{item.body}</div>
              {item.actionLabel ? (
                <div className="bg-notification-center__item-action">
                  <Button variant="link" size="sm" onClick={item.onAction}>
                    {item.actionLabel} →
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
