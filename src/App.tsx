import React, { useState, useCallback, createContext, useContext, useEffect } from 'react'
import TitleBar from './components/TitleBar'
import SoostoriSidebar, { type Page } from './components/sidebar/Sidebar'
import SoostoriHeader from './components/sidebar/Header'
import HeaderControls from './components/sidebar/HeaderControls'
import type { HeaderControlSlot } from './components/sidebar/HeaderControls'
import ToastContainer, { type ToastItem } from './components/ToastContainer'
import { type ToastVariant } from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import { NetworkStatusProvider } from './lib/network-status'
import { ThemeProvider } from './lib/theme-context'
import { LanguageProvider } from './lib/i18n-context'
import { dispatchHeaderAction } from './lib/header-controls-bus'
import LoginScreen from './components/LoginScreen'
import Settings from './pages/settings/Settings'
import POS from './pages/pos/POS'
import Inventory from './pages/inventory/Inventory'
import Reports from './pages/reports/Reports'
import DebtManagement from './pages/debt/DebtManagement'

// Toast context
interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}
export const ToastContext = createContext<ToastContextValue | null>(null)

// ============================================================
// PAGE CONFIG
// ============================================================
type PageConfig = {
  title: string
  subtitle?: string
}

const pageConfig: Record<Page, PageConfig> = {
  pos: { title: 'Point of Sale', subtitle: 'POS' },
  inventory: { title: 'Stock', subtitle: 'Inventory' },
  reports: { title: 'Reports', subtitle: 'Analytics' },
  debts: { title: 'Debt', subtitle: 'Collections' },
  settings: { title: 'Settings', subtitle: 'Configure' },
}

// Sidebar widths
const SIDEBAR_EXPANDED = 180
const SIDEBAR_COLLAPSED = 56

// ============================================================
// APP
// ============================================================
const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('pos')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true' } catch { return false }
  })
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [heldSalesCount, setHeldSalesCount] = useState(0)
  const [inventorySearch, setInventorySearch] = useState('')
  const [debtSearch, setDebtSearch] = useState('')
  const [reportsDateFilter, setReportsDateFilter] = useState('today')
  const [showLogin, setShowLogin] = useState(true)
  const [loginResolved, setLoginResolved] = useState(false)

  // Check PIN requirement on mount
  useEffect(() => {
    const checkLoginRequired = async () => {
      try {
        const defaults = await window.electronAPI.db.getAppSettingsDefaults()
        if (defaults.pinSet !== 1) { setShowLogin(false); setLoginResolved(true); return }
        const today = new Date().toDateString()
        const lastLogin = localStorage.getItem('lastLoginDate')
        if (lastLogin !== today) { setShowLogin(true) }
        else { setShowLogin(false) }
      } catch { setShowLogin(false) }
      setLoginResolved(true)
    }
    checkLoginRequired()
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail
      if (typeof detail === 'number') setHeldSalesCount(detail)
    }
    window.addEventListener('soostori:pos:held-count', handler)
    return () => window.removeEventListener('soostori:pos:held-count', handler)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      if (detail) setInventorySearch(detail.value)
    }
    window.addEventListener('soostori:app:inventorySearch', handler)
    return () => window.removeEventListener('soostori:app:inventorySearch', handler)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      if (detail) setDebtSearch(detail.value)
    }
    window.addEventListener('soostori:app:debtSearch', handler)
    return () => window.removeEventListener('soostori:app:debtSearch', handler)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      if (detail) setReportsDateFilter(detail.value)
    }
    window.addEventListener('soostori:app:reportsDate', handler)
    return () => window.removeEventListener('soostori:app:reportsDate', handler)
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
      return next
    })
  }, [])

  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page)
  }, [])

  const handleOpenSettings = useCallback(() => {
    setCurrentPage('settings')
  }, [])

  const handleLogin = useCallback(() => {
    setShowLogin(false)
  }, [])

  // Page-specific header controls rendered through the shared HeaderControls component
  const headerControls = useCallback((page: Page): HeaderControlSlot => {
    switch (page) {
      case 'pos': return { kind: 'pos', count: heldSalesCount }
      case 'inventory': return { kind: 'inventory', search: inventorySearch }
      case 'reports': return { kind: 'reports', dateFilter: reportsDateFilter }
      case 'debts': return { kind: 'debts', search: debtSearch }
      default: return null
    }
  }, [heldSalesCount, inventorySearch, debtSearch, reportsDateFilter])

  const renderPage = () => {
    switch (currentPage) {
      case 'pos': return <POS />
      case 'inventory': return <Inventory />
      case 'reports': return <Reports />
      case 'debts': return <DebtManagement />
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
              {/* Offline banner */}
              <OfflineBanner />

              {/* Custom title bar with window controls, notifications, settings */}
              <TitleBar onSettingsClick={handleOpenSettings} />

              {/* Body: sidebar + content */}
              <div className="flex flex-1 min-h-0">
                {/* Sidebar */}
                <SoostoriSidebar
                  currentPage={currentPage}
                  onNavigate={handleNavigate}
                  isCollapsed={sidebarCollapsed}
                  onToggleCollapse={handleToggleSidebar}
                />

                {/* Main area — sidebar is fixed, so offset content with marginLeft */}
                <div
                  className="flex-1 flex flex-col min-w-0 transition-[margin] duration-300"
                  style={{ marginLeft: sidebarWidth }}
                >
                  {/* Page header */}
                  <SoostoriHeader
                    title={pageConfig[currentPage].title}
                    subtitle={pageConfig[currentPage].subtitle}
                    controls={<HeaderControls slot={headerControls(currentPage)} />}
                  />

                  {/* Page content */}
                  <main className="flex-1 overflow-hidden bg-bg-primary dark:bg-bg-primary transition-colors duration-200">
                    {renderPage()}
                  </main>
                </div>
              </div>
            </div>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            {loginResolved && showLogin && <LoginScreen onLogin={handleLogin} />}
          </ToastContext.Provider>
        </NetworkStatusProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
