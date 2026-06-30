import React, { useState } from 'react'
import {
  ShoppingCart,
  Package,
  Settings as SettingsIcon,
  Store,
  History,
  Users,
  DollarSign,
  Receipt,
  Wallet,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react'
import { useDebtSummary } from './hooks/useDatabase'
import POS from './pages/POS'
import Inventory from './pages/Inventory'
import Settings from './pages/Settings'
import DebtManagement from './pages/DebtManagement'
import SalesReports from './pages/SalesReports'
import { useShopSettings } from './hooks/useDatabase'

// Menu items matching soostori exactly
const menuItems = [
  { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
  { id: 'inventory', label: 'Stock', icon: Package },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'debts', label: 'Debt', icon: DollarSign },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

type Page = 'pos' | 'inventory' | 'reports' | 'debts' | 'settings'

// Soostori Sidebar - exact match
const SoostoriSidebar: React.FC<{
  currentPage: Page
  onNavigate: (page: Page) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}> = ({ currentPage, onNavigate, isCollapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 bg-white border-r border-orange-50 
        ${isCollapsed ? 'w-20' : 'w-60'} 
        transition-all duration-300 z-[200] flex flex-col shadow-xl`}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 p-4 border-b border-orange-50">
        <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 shrink-0">
          <Store size={20} />
        </div>
        {!isCollapsed && (
          <span className="text-xl font-bold text-slate-800 tracking-tight">SOOSTORI</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as Page)}
              className={`w-full flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-xl transition-all group
                ${isActive
                  ? 'bg-brand-orange text-white shadow-md shadow-orange-200'
                  : 'text-slate-500 hover:bg-orange-50 hover:text-brand-orange'
                }`}
            >
              <Icon size={20} className="shrink-0" />
              {!isCollapsed && (
                <span className="font-semibold text-sm">{item.label}</span>
              )}
              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[300]">
                  {item.label}
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-4 border-t border-orange-50">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 rounded-xl text-brand-orange hover:bg-orange-100 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span className="text-sm font-semibold">Collapse</span>}
        </button>
      </div>

      {/* Support section */}
      {!isCollapsed && (
        <div className="p-4 border-t border-orange-50">
          <div className="p-2 bg-orange-50 rounded-xl">
            <p className="text-[9px] font-bold uppercase text-brand-orange tracking-wide">Support</p>
            <p className="text-xs font-semibold text-slate-600">+254 746 269 657</p>
          </div>
        </div>
      )}
    </aside>
  )
}

// Soostori Header - exact match
const SoostoriHeader: React.FC<{
  title: string
  icon: React.ReactNode
  subtitle?: string
}> = ({ title, icon, subtitle }) => {
  const { data: shopSettings } = useShopSettings()

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 z-[150]">
      {/* Left: Logo + title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-orange rounded-xl shadow-md shadow-orange-200 flex items-center justify-center text-white">
          {icon}
        </div>
        <div>
          <h1 className="text-sm md:text-base font-black text-slate-800">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Shop name + notification */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-100">
          <Store size={12} className="text-brand-orange" />
          <span className="text-xs font-semibold text-slate-600">
            {shopSettings?.name || 'My Shop'}
          </span>
        </div>
        <button className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center hover:bg-orange-100 transition-colors">
          <Bell size={18} className="text-brand-orange" />
        </button>
      </div>
    </header>
  )
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('pos')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const renderPage = () => {
    switch (currentPage) {
      case 'pos':
        return <POS />
      case 'inventory':
        return <Inventory />
      case 'reports':
        return <SalesReports />
      case 'debts':
        return <DebtManagement />
      case 'settings':
        return <Settings />
      default:
        return <POS />
    }
  }

  const pageConfig = {
    pos: { title: 'Point of Sale', icon: <ShoppingCart size={20} /> },
    inventory: { title: 'Stock', icon: <Package size={18} />, subtitle: 'Inventory Management' },
    reports: { title: 'Reports', icon: <BarChart3 size={18} />, subtitle: 'Sales History & Analytics' },
    debts: { title: 'Debt Management', icon: <DollarSign size={18} />, subtitle: 'Track customer debts' },
    settings: { title: 'Settings', icon: <SettingsIcon size={18} />, subtitle: 'Configure your shop' },
  }

  return (
    <div className="flex min-h-screen bg-soft-yellow font-['Fredoka']">
      {/* Sidebar */}
      <SoostoriSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-60'
        }`}
      >
        {/* Header */}
        <SoostoriHeader
          title={pageConfig[currentPage].title}
          icon={pageConfig[currentPage].icon}
          subtitle={pageConfig[currentPage].subtitle}
        />

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-slate-50/30">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
