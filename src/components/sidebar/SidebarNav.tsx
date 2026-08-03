import React from 'react'
import {
  ShoppingCart,
  Package,
  BarChart3,
  DollarSign,
  Settings as SettingsIcon,
} from 'lucide-react'
import NavItemButton from './NavItemButton'

// ============================================================
// TYPES
// ============================================================
type Page = 'pos' | 'inventory' | 'reports' | 'debts' | 'settings'

interface NavItem {
  id: Page
  label: string
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

// ============================================================
// NAVIGATION DATA — grouped by purpose
// ============================================================
const navGroups: NavGroup[] = [
  {
    label: 'Store',
    items: [{ id: 'pos', label: 'Point of Sale', icon: ShoppingCart }],
  },
  {
    label: 'Catalog',
    items: [{ id: 'inventory', label: 'Stock', icon: Package }],
  },
  {
    label: 'Finance',
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'debts', label: 'Debt', icon: DollarSign },
    ],
  },
  {
    label: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: SettingsIcon }],
  },
]

// ============================================================
// NAV GROUP LIST
// ============================================================
interface SidebarNavProps {
  currentPage: Page
  isCollapsed: boolean
  onNavigate: (page: Page) => void
}

const SidebarNav: React.FC<SidebarNavProps> = ({ currentPage, isCollapsed, onNavigate }) => (
  <nav className="flex-1 overflow-y-auto pt-1.5 px-2 space-y-3 bg-bg-secondary dark:bg-slate-900 transition-colors duration-200">
    {navGroups.map((group) => (
      <div key={group.label}>
        {/* Group label */}
        {group.label && !isCollapsed && (
          <p className="px-2 mb-1 text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-500 transition-colors duration-200">
            {group.label}
          </p>
        )}
        {group.label && isCollapsed && (
          <div className="flex justify-center mb-1">
            <div className="w-5 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
        )}

        {/* Nav items */}
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavItemButton
              key={item.id}
              item={item}
              isActive={currentPage === item.id}
              isCollapsed={isCollapsed}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </div>
      </div>
    ))}
  </nav>
)

export default SidebarNav
export type { Page, NavItem, NavGroup }
