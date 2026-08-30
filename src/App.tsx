import React, { useCallback, useMemo, useState, createContext } from 'react'
import TitleBar from './components/TitleBar'
import SoostoriSidebar, { type Page } from './components/sidebar/Sidebar'
import SoostoriHeader from './components/sidebar/Header'
import HeaderControls from './components/sidebar/HeaderControls'
import type { HeaderControlSlot } from './components/sidebar/HeaderControls'
import ToastContainer from './components/ToastContainer'
import type { ToastVariant } from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import { NetworkStatusProvider } from './lib/network-status'
import { ThemeProvider } from './lib/theme-context'
import { LanguageProvider } from './lib/i18n-context'
import { useToastController } from './lib/toast-controller'
import { useHeaderControlEvents } from './lib/header-control-events'
import { useLoginStatus } from './lib/login-status'
import { useSidebarPrefs, SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED } from './lib/sidebar-prefs'
import LoginScreen from './components/LoginScreen'
import Settings from './pages/settings/Settings'
import POS from './pages/pos/POS'
import Inventory from './pages/inventory/Inventory'
import Reports from './pages/reports/Reports'
import DebtManagement from './pages/debt/DebtManagement'
import ExpensesPage from './pages/expenses/ExpensesPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import { useNotifications } from './hooks/useNotifications'

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}
export const ToastContext = createContext<ToastContextValue | null>(null)

type PageConfig = { title: string; subtitle?: string }
const PAGE_CONFIG: Record<Page, PageConfig> = {
  pos: { title: 'Point of Sale', subtitle: 'POS' },
  inventory: { title: 'Stock', subtitle: 'Inventory' },
  reports: { title: 'Reports', subtitle: 'Analytics' },
  debts: { title: 'Debt', subtitle: 'Collections' },
  expenses: { title: 'Expenses', subtitle: 'Track spending' },
  notifications: { title: 'Notifications', subtitle: 'Alerts' },
  settings: { title: 'Settings', subtitle: 'Configure' },
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('pos')
  const { collapsed: sidebarCollapsed, toggle: handleToggleSidebar } = useSidebarPrefs()
  const { toasts, showToast, dismissToast } = useToastController()
  const { heldSalesCount, inventorySearch, debtSearch, reportsDateFilter } = useHeaderControlEvents()
  const { showLogin, loginResolved, dismissLogin } = useLoginStatus()
  useNotifications() // Initialises low-stock listener from main process

  const handleNavigate = useCallback((page: Page) => setCurrentPage(page), [])
  const handleOpenSettings = useCallback(() => setCurrentPage('settings'), [])

  const headerControls = useMemo<HeaderControlSlot>(() => {
    switch (currentPage) {
      case 'pos': return { kind: 'pos', count: heldSalesCount }
      case 'inventory': return { kind: 'inventory', search: inventorySearch }
      case 'reports': return { kind: 'reports', dateFilter: reportsDateFilter }
      case 'debts': return { kind: 'debts', search: debtSearch }
      case 'expenses': return null
      default: return null
    }
  }, [currentPage, heldSalesCount, inventorySearch, debtSearch, reportsDateFilter])

  const renderPage = () => {
    switch (currentPage) {
      case 'pos': return <POS />
      case 'inventory': return <Inventory />
      case 'reports': return <Reports />
      case 'debts': return <DebtManagement />
      case 'expenses': return <ExpensesPage />
      case 'notifications': return <NotificationsPage />
      case 'settings': return <Settings />
      default: return null
    }
  }

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  return (
    <ThemeProvider>
      <LanguageProvider>
        <NetworkStatusProvider>
          <ToastContext.Provider value={{ showToast }}>
            <div className="flex flex-col h-screen bg-bg-primary font-['Fredoka'] overflow-hidden transition-colors duration-200">
              <OfflineBanner />
              <TitleBar onSettingsClick={handleOpenSettings} />

              <div className="flex flex-1 min-h-0">
                <SoostoriSidebar
                  currentPage={currentPage}
                  onNavigate={handleNavigate}
                  isCollapsed={sidebarCollapsed}
                  onToggleCollapse={handleToggleSidebar}
                />

                <div
                  className="flex-1 flex flex-col min-w-0 transition-[margin] duration-300"
                  style={{ marginLeft: sidebarWidth }}
                >
                  <SoostoriHeader
                    title={PAGE_CONFIG[currentPage].title}
                    subtitle={PAGE_CONFIG[currentPage].subtitle}
                    controls={<HeaderControls slot={headerControls} />}
                  />
                  <main className="flex-1 overflow-hidden bg-bg-primary dark:bg-bg-primary transition-colors duration-200">
                    {renderPage()}
                  </main>
                </div>
              </div>
            </div>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            {loginResolved && showLogin && <LoginScreen onLogin={dismissLogin} />}
          </ToastContext.Provider>
        </NetworkStatusProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
