import React from 'react'
import { ShoppingCart, Package, BarChart3, DollarSign, Bell, Receipt, Users, Monitor, Settings as SettingsIcon } from 'lucide-react'
import NavItemButton from './NavItemButton'
import { useTranslation } from '../../lib/useTranslation'
import { useAuth } from '../../lib/auth-context'
import type { TranslationKey } from '../../lib/i18n'

// ============================================================
// TYPES
// ============================================================
type Page = 'pos' | 'inventory' | 'reports' | 'debts' | 'expenses' | 'settings' | 'notifications' | 'team' | 'devices'

interface NavItem {
  id: Page
  labelKey: TranslationKey
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>
  permission?: string
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
    items: [{ id: 'inventory', labelKey: 'nav.inventory', icon: Package, permission: 'inventory' }],
  },
  {
    labelKey: 'nav.finance',
    items: [
      { id: 'reports', labelKey: 'nav.reports', icon: BarChart3, permission: 'reports' },
      { id: 'debts', labelKey: 'nav.debts', icon: DollarSign, permission: 'customers' },
      { id: 'expenses', labelKey: 'nav.expenses', icon: Receipt, permission: 'expenses' },
      { id: 'notifications', labelKey: 'nav.notifications', icon: Bell },
    ],
  },
  {
    labelKey: 'nav.team',
    items: [
      { id: 'team', labelKey: 'nav.team', icon: Users, permission: 'team' },
      { id: 'devices', labelKey: 'nav.devices', icon: Monitor, permission: 'devices' },
    ],
  },
  {
    labelKey: 'nav.system',
    items: [{ id: 'settings', labelKey: 'nav.settings', icon: SettingsIcon, permission: 'settings' }],
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
  const { can } = useAuth()

  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.permission || can(item.permission)),
  })).filter(group => group.items.length > 0)

  return (
    <nav className="flex-1 overflow-y-auto pt-1.5 px-2 space-y-3 bg-bg-secondary dark:bg-slate-900 transition-colors duration-200">
      {visibleGroups.map((group) => (
        <div key={group.labelKey}>
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
