import type { ReactNode } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { NotificationsIcon } from './icons/NotificationsIcon';

export interface TopNavLink {
  key: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}

export interface TopNavProps {
  title?: string;
  subtitle?: string;
  brandName?: string;
  brandBadge?: string;
  companyName?: string;
  bceNumber?: string;
  links?: TopNavLink[];
  onNavigateHome?: () => void;
  onCreateBill?: () => void;
  onCreateInvoiceClick?: () => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onAvatarClick?: () => void;
  onProfileClick?: () => void;
  onHelpClick?: () => void;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
  notificationCount?: number;
  unreadCount?: number;
  avatarInitials?: string;
  accountSlot?: ReactNode;
  variant?: 'solid' | 'translucent' | 'glass';
  children?: ReactNode;
  className?: string;
}

export function TopNav({
  brandName = 'BillGen',
  brandBadge = 'Peppol 2026 Ready',
  companyName = 'BillGen Technologies',
  bceNumber = 'BE 0799.123.456',
  onCreateBill,
  onCreateInvoiceClick,
  onSearchClick,
  onNotificationsClick,
  onProfileClick,
  onHelpClick,
  onThemeToggle,
  isDarkMode = false,
  notificationCount,
  unreadCount = 0,
  avatarInitials = 'AR',
  children,
  className = '',
}: TopNavProps) {
  const actualNotificationCount = notificationCount ?? unreadCount;
  const handleCreate = onCreateInvoiceClick || onCreateBill;

  return (
    <header
      className={`h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between shrink-0 transition-colors z-20 ${className}`}
    >
      {/* Search Bar / Left Side */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onSearchClick}
          className="relative flex items-center w-60 sm:w-80 md:w-96 text-left group"
        >
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-600 transition-colors">
            <SearchIcon className="w-4 h-4" />
          </span>
          <span className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between transition-all">
            <span>Rechercher factures, clients, devis...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded">
              ⌘K
            </kbd>
          </span>
        </button>

        {children}
      </div>

      {/* Actions & Profile / Right Side */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        {/* Quick New Invoice Action Button */}
        {handleCreate && (
          <button
            type="button"
            onClick={handleCreate}
            className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Nouvelle facture</span>
          </button>
        )}

        {/* Theme Toggle */}
        {onThemeToggle && (
          <button
            type="button"
            onClick={onThemeToggle}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        )}

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={onNotificationsClick}
          className="relative p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <NotificationsIcon className="w-5 h-5" />
          {actualNotificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          )}
        </button>

        {/* User Account / Profile */}
        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center space-x-3 pl-3 sm:pl-5 border-l border-slate-200 dark:border-slate-800 hover:opacity-90 transition-opacity text-left"
        >
          <div className="hidden sm:block text-right">
            <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {companyName}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {bceNumber || brandBadge}
            </div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-100 dark:bg-indigo-900/60 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border border-indigo-200 dark:border-indigo-800 shadow-xs">
            {avatarInitials}
          </div>
        </button>
      </div>
    </header>
  );
}
