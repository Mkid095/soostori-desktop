import React from 'react'
import {
  ShoppingCart,
  Package,
  BarChart3,
  DollarSign,
  Settings as SettingsIcon,
} from 'lucide-react'
import NavItemButton from './NavItemButton'
import { useTranslation } from '../../lib/useTranslation'
import type { TranslationKey } from '../../lib/i18n'

// ============================================================
// TYPES
// ============================================================
type Page = 'pos' | 'inventory' | 'reports' | 'debts' | 'settings'

interface NavItem {
  id: Page
  labelKey: TranslationKey
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>
}

interface NavGroup {
  labelKey?: TranslationKey
  items: NavItem[]
}

// ============================================================
// NAVIGATION DATA — grouped by purpose
// ============================================================
const navGroups: NavGroup[] = [
  {
    labelKey: 'nav.store',
    items: [{ id: 'pos', labelKey: 'nav.pos', icon: ShoppingCart }],
  },
  {
    labelKey: 'nav.catalog',
    items: [{ id: 'inventory', labelKey: 'nav.inventory', icon: Package }],
  },
  {
    labelKey: 'nav.finance',
    items: [
      { id: 'reports', labelKey: 'nav.reports', icon: BarChart3 },
      { id: 'debts', labelKey: 'nav.debts', icon: DollarSign },
    ],
  },
  {
    labelKey: 'nav.system',
    items: [{ id: 'settings', labelKey: 'nav.settings', icon: SettingsIcon }],
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

const SidebarNav: React.FC<SidebarNavProps> = ({ currentPage, isCollapsed, onNavigate }) => {
  const { t } = useTranslation()
  return (
    <nav className="flex-1 overflow-y-auto pt-1.5 px-2 space-y-3 bg-bg-secondary dark:bg-slate-900 transition-colors duration-200">
      {navGroups.map((group) => (
        <div key={group.labelKey}>
          {/* Group label */}
          {group.labelKey && !isCollapsed && (
            <p className="px-2 mb-1 text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-500 transition-colors duration-200">
              {t(group.labelKey)}
            </p>
          )}
          {group.labelKey && isCollapsed && (
            <div className="flex justify-center mb-1">
              <div className="w-5 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          )}

          {/* Nav items */}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavItemButton
                key={item.id}
                item={{ ...item, label: t(item.labelKey) }}
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
}

export default SidebarNav
export type { Page }
