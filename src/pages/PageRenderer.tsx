import React from 'react'
import Settings from '../pages/settings/Settings'
import POS from '../pages/pos/POS'
import Inventory from '../pages/inventory/Inventory'
import Reports from '../pages/reports/Reports'
import DebtManagement from '../pages/debt/DebtManagement'
import ExpensesPage from '../pages/expenses/ExpensesPage'
import NotificationsPage from '../pages/notifications/NotificationsPage'
import TeamPage from '../pages/team/TeamPage'
import DevicesPage from '../pages/devices/DevicesPage'
import CommissionsPage from '../pages/commissions/CommissionsPage'
import BusinessPage from '../pages/business/BusinessPage'

interface Props {
  page: string
}

export function PageRenderer({ page }: Props): React.ReactElement {
  switch (page) {
    case 'pos': return <POS />
    case 'inventory': return <Inventory />
    case 'reports': return <Reports />
    case 'debts': return <DebtManagement />
    case 'expenses': return <ExpensesPage />
    case 'notifications': return <NotificationsPage />
    case 'settings': return <Settings />
    case 'team': return <TeamPage />
    case 'devices': return <DevicesPage />
    case 'commissions': return <CommissionsPage />
    case 'business': return <BusinessPage />
    default: return <div className="p-6 text-slate-500">Page not found</div>
  }
}
