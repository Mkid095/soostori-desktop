import React from 'react'
import { RefreshCw, Usb, Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  status: 'disconnected' | 'connected' | 'error' | 'auto'
  port?: string
  onDisconnect?: () => void
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, port, onDisconnect }) => (
  <div className={`p-4 rounded-2xl flex items-center gap-3 ${
    status === 'connected' ? 'bg-emerald-50' : status === 'error' ? 'bg-red-50' : 'bg-slate-50'
  }`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
      status === 'connected' ? 'bg-emerald-100 text-emerald-600' :
      status === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'
    }`}>
      {status === 'connected' ? <Wifi size={20} /> : <WifiOff size={20} />}
    </div>
    <div>
      <p className={`font-bold text-sm ${
        status === 'connected' ? 'text-emerald-700' : status === 'error' ? 'text-red-700' : 'text-slate-600'
      }`}>
        {status === 'connected' ? 'Connected' : status === 'error' ? 'Failed' : status === 'auto' ? 'Auto-Detected' : 'Not Connected'}
      </p>
      {port && <p className="text-xs text-slate-400">{port}</p>}
    </div>
    {status === 'connected' && onDisconnect && (
      <button onClick={onDisconnect} className="ml-auto px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100">Disconnect</button>
    )}
  </div>
)

interface ActionButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  icon: React.ReactNode
  label: string
  variant?: 'primary' | 'secondary'
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onClick, disabled, loading, icon, label, variant = 'primary' }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`w-full py-4 rounded-full font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-200 ${
      variant === 'primary' ? 'bg-brand-orange text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    {loading ? <RefreshCw size={16} className="animate-spin" /> : icon}
    {label}
  </button>
)

interface PortSelectProps {
  ports: string[]
  selectedPort: string
  onPortChange: (port: string) => void
  onRefresh: () => void
}

export const PortSelect: React.FC<PortSelectProps> = ({ ports, selectedPort, onPortChange, onRefresh }) => (
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Serial Port</label>
    <select
      value={selectedPort}
      onChange={(e) => onPortChange(e.target.value)}
      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
    >
      <option value="">Select a port...</option>
      {ports.map((port) => <option key={port} value={port}>{port}</option>)}
    </select>
    <button onClick={onRefresh} className="mt-2 text-xs font-bold text-brand-orange hover:underline flex items-center gap-1">
      <RefreshCw size={12} /> Refresh ports
    </button>
  </div>
)

export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200]

interface BaudRateSelectProps {
  value: number
  onChange: (rate: number) => void
}

export const BaudRateSelect: React.FC<BaudRateSelectProps> = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Baud Rate</label>
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
    >
      {BAUD_RATES.map((rate) => <option key={rate} value={rate}>{rate}</option>)}
    </select>
  </div>
)
