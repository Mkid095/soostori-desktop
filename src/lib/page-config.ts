import { type Page } from '../components/sidebar/Sidebar'

export type { Page }

export type PageConfig = { title: string; subtitle?: string }

export const PAGE_CONFIG: Record<Page, PageConfig> = {
  pos: { title: 'Point of Sale', subtitle: 'POS' },
  inventory: { title: 'Stock', subtitle: 'Inventory' },
  reports: { title: 'Reports', subtitle: 'Analytics' },
  debts: { title: 'Debt', subtitle: 'Collections' },
  expenses: { title: 'Expenses', subtitle: 'Track spending' },
  notifications: { title: 'Notifications', subtitle: 'Alerts' },
  settings: { title: 'Settings', subtitle: 'Configure' },
  team: { title: 'Team', subtitle: 'Manage staff' },
  devices: { title: 'Devices', subtitle: 'Terminals' },
}
