import React, { useCallback, useMemo, useState, createContext, useEffect } from 'react'
import TitleBar from './components/TitleBar'
import SoostoriSidebar, { type Page } from './components/sidebar/Sidebar'
import SoostoriHeader from './components/sidebar/Header'
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
import { api } from './lib/api'
import type { ShopUser, Device } from '../electron/preload/types'
import { PAGE_CONFIG } from './lib/page-config'

const DEV_MODE = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

interface ToastContextValue { showToast: (message: string, variant?: ToastVariant) => void }
export const ToastContext = createContext<ToastContextValue | null>(null)

type CloudAuthStep = 'none' | 'logging-in' | 'logged-in'

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('pos')
  const { collapsed: sidebarCollapsed, toggle: handleToggleSidebar } = useSidebarPrefs()
  const { toasts, showToast, dismissToast } = useToastController()
  const { heldSalesCount, inventorySearch, debtSearch, reportsDateFilter } = useHeaderControlEvents()
  const { showLogin, loginResolved, dismissLogin } = useLoginStatus()
  useNotifications()

  const [shopExists, setShopExists] = useState<boolean | null>(null)
  const [authUser, setAuthUser] = useState<ShopUser | null>(null)
  const [authDevice, setAuthDevice] = useState<Device | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [cloudAuthStep, setCloudAuthStep] = useState<CloudAuthStep>('none')
  const [pendingCloudAuth, setPendingCloudAuth] = useState<{ shopId: string; userId: string; deviceId: string } | null>(null)

  // On startup: try to restore a previous cloud session, otherwise check local shop
  useEffect(() => {
    async function init() {
      const cloud = window.electronAPI?.cloudAuth
      if (cloud) {
        try {
          const restored = await cloud.restoreSession()
          if (restored.restored) {
            setCloudAuthStep('logged-in')
            // Check if shop exists locally; if not, wait for full sync
            const shop = await api.getShop()
            if (shop) setShopExists(true)
            else setShopExists(false)
            return
          }
        } catch { /* cloud not available */ }
      }
      // Fallback: check local shop
      api.getShop().then(shop => {
        setShopExists(!!shop)
        setShowSetup(DEV_MODE && !shop)
      }).catch(() => setShopExists(false))
    }
    init()
  }, [])

  const handleNavigate = useCallback((page: Page) => setCurrentPage(page), [])
  const handleOpenSettings = useCallback(() => setCurrentPage('settings'), [])

  // Cloud login completed — switch to local PIN login
  const handleCloudLoginComplete = useCallback((shopId: string, userId: string, deviceId: string) => {
    setCloudAuthStep('logged-in')
    setPendingCloudAuth({ shopId, userId, deviceId })
    setShopExists(true)
  }, [])

  const handleLogin = useCallback((user: ShopUser, sid: string, deviceId: string) => {
    setAuthUser(user)
    setSessionId(sid)
    api.registerDevice({ name: deviceId, employeeId: user.id }).then(dev => setAuthDevice(dev)).catch(() => {})
    setShowSetup(false)
    dismissLogin()
  }, [dismissLogin])

  const handleSetupComplete = useCallback(() => {
    setShopExists(true)
    setShowSetup(false)
  }, [])

  const { can } = usePermissions(authUser)
  const authValue = useMemo(() => ({ user: authUser, device: authDevice, sessionId, can }), [authUser, authDevice, sessionId, can])

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

  // Loading
  if (shopExists === null) return null

  // Cloud auth in progress — show CloudLoginScreen
  if (!shopExists && !showSetup && cloudAuthStep === 'none') {
    return (
      <ThemeProvider><LanguageProvider>
        <CloudLoginScreen
          onComplete={handleCloudLoginComplete}
          fallbackToSetup={() => setShowSetup(DEV_MODE)}
        />
      </LanguageProvider></ThemeProvider>
    )
  }

  // Dev mode: show local setup wizard
  if (showSetup) {
    return (
      <ThemeProvider><LanguageProvider>
        <SetupWizard onComplete={handleSetupComplete} />
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
                    <SoostoriHeader title={title} subtitle={subtitle} controls={<HeaderControls slot={headerControls} />} />
                    <main className="flex-1 overflow-hidden bg-bg-primary dark:bg-bg-primary transition-colors duration-200">
                      <PageRendererComponent page={currentPage} />
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
