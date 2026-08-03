import React, { useState } from 'react'
import { Store, Printer, Scan, Database, Info, Shield, ChevronRight, CreditCard } from 'lucide-react'
import SettingsModal from './components/SettingsModal'
import ShopSettingsForm from './components/ShopSettingsForm'
import ScannerSettings from './components/ScannerSettings'
import PrinterSettings from './components/PrinterSettings'
import PaymentSettings from './components/PaymentSettings'
import DataManagement from './components/DataManagement'
import About from './components/About'

interface SectionCardProps {
  icon: React.ReactNode; title: string; description: string; onClick: () => void
  badge?: string; badgeColor?: string
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, description, onClick, badge, badgeColor }) => (
  <button onClick={onClick} className="w-full bg-bg-secondary dark:bg-bg-secondary p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-brand-orange/20 transition-all flex items-center gap-4 text-left group">
    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-brand-orange shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h3>
        {badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>{badge}</span>}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{description}</p>
    </div>
    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-brand-orange transition-colors shrink-0" />
  </button>
)

const sections = [
  { id: 'shop', icon: <Store size={22} />, title: 'Shop Details', description: 'Name, address, phone, currency', badge: 'Required', badgeColor: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300' },
  { id: 'payment', icon: <CreditCard size={22} />, title: 'Payment Settings', description: 'M-Pesa Till, Paybill, Account' },
  { id: 'scanner', icon: <Scan size={22} />, title: 'Barcode Scanner', description: 'Keyboard wedge or serial port' },
  { id: 'printer', icon: <Printer size={22} />, title: 'Printer Setup', description: 'ESC/POS thermal or system print' },
  { id: 'data', icon: <Database size={22} />, title: 'Data Management', description: 'Export and import your data' },
  { id: 'about', icon: <Info size={22} />, title: 'About', description: 'App version and information' },
]

const modalConfigs: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
  shop: { title: 'Shop Details', subtitle: 'Shop info and receipt config', icon: <Store size={20} /> },
  payment: { title: 'Payment Settings', subtitle: 'M-Pesa, Paybill, Account', icon: <CreditCard size={20} /> },
  scanner: { title: 'Barcode Scanner', subtitle: 'Configure scanner', icon: <Scan size={20} /> },
  printer: { title: 'Printer Setup', subtitle: 'Receipt printer', icon: <Printer size={20} /> },
  data: { title: 'Data Management', subtitle: 'Backup and restore', icon: <Database size={20} /> },
  about: { title: 'About', subtitle: 'App info', icon: <Info size={20} /> },
}

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const renderModal = () => {
    switch (activeSection) {
      case 'shop': return <ShopSettingsForm onClose={() => setActiveSection(null)} />
      case 'payment': return <PaymentSettings onClose={() => setActiveSection(null)} />
      case 'scanner': return <ScannerSettings onClose={() => setActiveSection(null)} />
      case 'printer': return <PrinterSettings onClose={() => setActiveSection(null)} />
      case 'data': return <DataManagement />
      case 'about': return <About />
      default: return null
    }
  }
  const config = activeSection ? modalConfigs[activeSection] : null
  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden transition-colors duration-200">
      <div className="bg-bg-secondary dark:bg-bg-secondary px-4 md:px-5 py-3.5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 shrink-0 transition-colors duration-200">
        <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center text-white"><Shield size={18} /></div>
        <div><h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Settings</h1><p className="text-xs text-slate-400 dark:text-slate-500">Configure your shop</p></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sections.map((s) => <SectionCard key={s.id} icon={s.icon} title={s.title} description={s.description} badge={s.badge} badgeColor={s.badgeColor} onClick={() => setActiveSection(s.id)} />)}
      </div>
      {activeSection && config && (
        <SettingsModal title={config.title} subtitle={config.subtitle} icon={config.icon} onClose={() => setActiveSection(null)}>
          {renderModal()}
        </SettingsModal>
      )}
    </div>
  )
}

export default Settings
