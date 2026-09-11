/**
 * App.tsx — Root layout, page routing, and auth orchestration.
 *
 * Startup logic extracted to useAppInit hook.
 * Auth callbacks extracted to useAppAuth hook.
 * Per ANPAS: UI components must not contain business logic.
 */

import React, { useCallback, useMemo, useState } from 'react'
import TitleBar from './components/TitleBar'
import PrimaryStatusIndicator from './components/PrimaryStatusIndicator'
import SoostoriSidebar, { type Page } from './components/sidebar/Sidebar'
import HeaderControls from './components/sidebar/HeaderControls'
import type { HeaderControlSlot } from './components/sidebar/HeaderControls'
import ToastContainer from './components/ToastContainer'
import type { ToastVariant } from './components/Toast'
import { NetworkStatusProvider } from './lib/network-status'
import { ThemeProvider } from './lib/theme-context'
import { LanguageProvider } from './lib/i18n-context'
import { useToastController } from './lib/toast-controller'
import { useHeaderControlEvents } from './lib/header-control-events'
import { useLoginStatus } from './lib/login-status'
import { useSidebarPrefs, SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED } from './lib/sidebar-prefs'
import LoginScreen from './components/LoginScreen'
import SetupWizard from './components/SetupWizard'
import CloudLoginScreen from './components/CloudLoginScreen'
import { AuthProvider } from './lib/auth-context'
import { PageRenderer as PageRendererComponent } from './pages/PageRenderer'
import { usePermissions } from './hooks/usePermissions'
import { useNotifications } from './hooks/useNotifications'
import { useAppInit } from './hooks/useAppInit'
import { useAppAuth } from './hooks/useAppAuth'
import type { ShopUser } from '../electron/preload/types'
import { PAGE_CONFIG } from './lib/page-config'

const DEV_MODE = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

interface ToastContextValue { showToast: (message: string, variant?: ToastVariant) => void }
export const ToastContext = React.createContext<ToastContextValue | null>(null)

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('pos')
  const { collapsed: sidebarCollapsed, toggle: handleToggleSidebar } = useSidebarPrefs()
  const { toasts, showToast, dismissToast } = useToastController()
  const { heldSalesCount, inventorySearch, debtSearch, reportsDateFilter } = useHeaderControlEvents()
  const { showLogin, loginResolved, dismissLogin } = useLoginStatus()
  useNotifications()

  const {
    shopExists, cloudAuthStep, pendingCloudAuth,
    setCloudAuthStep, setPendingCloudAuth, setShopExists,
  } = useAppInit()

  const [showSetup, setShowSetup] = useState(false)
  const [authUser, setAuthUser] = useState<ShopUser | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const { handleCloudLoginComplete, handleLogin } = useAppAuth({
    cloudAuthStep, pendingCloudAuth,
    setCloudAuthStep, setPendingCloudAuth, setShopExists,
    onLoginComplete: (_user, _sid) => {
      setAuthUser(_user)
      setSessionId(_sid)
      setShowSetup(false)
      dismissLogin()
    },
  })

  const handleNavigate = useCallback((page: Page) => setCurrentPage(page), [])
  const handleOpenSettings = useCallback(() => setCurrentPage('settings'), [])
  const handleDashboardReportNavigate = useCallback((tab: 'sales' | 'inventory' | 'debt' | 'expense') => {
    setCurrentPage(tab === 'sales' ? 'reports' : tab === 'inventory' ? 'inventory' : tab === 'debt' ? 'debts' : 'expenses')
  }, [])

  const { can } = usePermissions(authUser)
  const authValue = useMemo(() => ({ user: authUser, device: null, sessionId, can }), [authUser, sessionId, can])

  const headerControls = useMemo<HeaderControlSlot>(() => {
    switch (currentPage) {
      case 'pos': return { kind: 'pos', count: heldSalesCount }
      case 'inventory': return { kind: 'inventory', search: inventorySearch }
      case 'reports': return { kind: 'reports', dateFilter: reportsDateFilter }
      case 'debts': return { kind: 'debts', search: debtSearch }
      case 'expenses': return null
      case 'commissions': return null
      default: return null
    }
  }, [currentPage, heldSalesCount, inventorySearch, debtSearch, reportsDateFilter])

  if (shopExists === null) return null

  if (!shopExists && !showSetup && cloudAuthStep === 'none') {
    return (
      <ThemeProvider><LanguageProvider>
        <CloudLoginScreen
          onComplete={handleCloudLoginComplete}
          fallbackToSetup={() => { setCloudAuthStep('none'); setShowSetup(DEV_MODE) }}
        />
      </LanguageProvider></ThemeProvider>
    )
  }

  if (showSetup) {
    return (
      <ThemeProvider><LanguageProvider>
        <SetupWizard onComplete={() => { setShopExists(true); setShowSetup(false) }} />
      </LanguageProvider></ThemeProvider>
    )
  }

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
  const { title, subtitle } = PAGE_CONFIG[currentPage]

  return (
    <ThemeProvider>
      <LanguageProvider>
        <NetworkStatusProvider>
          <AuthProvider value={authValue}>
            <ToastContext.Provider value={{ showToast }}>
              <div className="flex flex-col h-screen bg-bg-primary font-['Fredoka'] overflow-hidden transition-colors duration-200">
                <TitleBar onSettingsClick={handleOpenSettings} />
                <div className="flex flex-1 min-h-0">
                  <SoostoriSidebar currentPage={currentPage} onNavigate={handleNavigate}
                    isCollapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar} />
                  <div className="flex-1 flex flex-col min-w-0 transition-[margin] duration-300"
                    style={{ marginLeft: sidebarWidth }}>
                    <div className="flex items-center gap-3 border-b border-border-color bg-bg-secondary px-4 h-12 shrink-0 transition-colors duration-200">
                      <div className="min-w-0 flex-1">
                        <h1 className="truncate text-[14px] font-black leading-tight text-text-primary">{title}</h1>
                        {subtitle && <p className="truncate text-[10px] leading-tight text-text-muted">{subtitle}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <PrimaryStatusIndicator />
                        {headerControls && <HeaderControls slot={headerControls} />}
                      </div>
                    </div>
                    <main className="flex-1 overflow-hidden bg-bg-primary dark:bg-bg-primary transition-colors duration-200">
                      <PageRendererComponent page={currentPage} onNavigate={handleDashboardReportNavigate} />
                    </main>
                  </div>
                </div>
              </div>
              <ToastContainer toasts={toasts} onDismiss={dismissToast} />
              {loginResolved && showLogin && <LoginScreen onLogin={handleLogin} />}
            </ToastContext.Provider>
          </AuthProvider>
        </NetworkStatusProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
