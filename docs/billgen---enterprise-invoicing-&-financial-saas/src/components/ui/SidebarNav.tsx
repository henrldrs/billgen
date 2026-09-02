import type { ReactNode } from 'react';

export interface SidebarNavItem {
  key: string;
  label: string;
  category?: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
  activeKey: string;
  onSelectKey: (key: string) => void;
  collapsed?: boolean;
}

export function SidebarNav({ items, activeKey, onSelectKey, collapsed }: SidebarNavProps) {
  // Group items by category if provided
  return (
    <nav className="space-y-1" aria-label="Menu principal">
      {items.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectKey(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            } ${collapsed ? 'justify-center px-2' : 'justify-between'}`}
            title={collapsed ? item.label : undefined}
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.icon ? <span className="text-base shrink-0">{item.icon}</span> : null}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </div>
            {!collapsed && item.badge ? <div>{item.badge}</div> : null}
          </button>
        );
      })}
    </nav>
  );
}
