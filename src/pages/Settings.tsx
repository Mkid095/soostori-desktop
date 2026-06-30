import React, { useState, useEffect } from 'react'
import {
  Store,
  Printer,
  Monitor,
  Database,
  Shield,
  ChevronRight,
  Save,
  RefreshCw,
  X,
  Wifi,
  WifiOff,
  Usb,
  Download,
  Upload,
  Info,
  Bell,
  Scan,
  CreditCard,
  Keyboard,
} from 'lucide-react'
import { useShopSettings, useUpdateShopSettings } from '../hooks/useDatabase'

// ========== SECTION WRAPPER ==========

const SectionCard: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  badge?: string
  badgeColor?: string
}> = ({ icon, title, description, onClick, badge, badgeColor = 'bg-brand-orange text-white' }) => (
  <button
    onClick={onClick}
    className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange/20 transition-all flex items-center gap-4 text-left group"
  >
    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-brand-orange shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h3 className="font-bold text-slate-800 truncate">{title}</h3>
        {badge && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 truncate">{description}</p>
    </div>
    <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-orange transition-colors shrink-0" />
  </button>
)

// ========== SHOP SETTINGS FORM ==========

const ShopSettingsForm: React.FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { data: settings, isLoading } = useShopSettings()
  const updateSettings = useUpdateShopSettings()

  const [form, setForm] = useState({
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    currency: 'KES',
    receiptFooter: 'Thank you for shopping with us!',
    receiptPrefix: 'INV',
    lowStockThreshold: '5',
  })

  useEffect(() => {
    if (settings) {
      setForm({
        shopName: settings.shopName || settings.name || '',
        shopAddress: settings.shopAddress || settings.address || '',
        shopPhone: settings.shopPhone || settings.phone || '',
        shopEmail: settings.shopEmail || settings.email || '',
        currency: settings.currency || 'KES',
        receiptFooter: settings.receiptFooter || 'Thank you for shopping with us!',
        receiptPrefix: settings.receiptPrefix || 'INV',
        lowStockThreshold: String(settings.lowStockThreshold || 5),
      })
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings.mutateAsync({
      shopName: form.shopName,
      shopAddress: form.shopAddress,
      shopPhone: form.shopPhone,
      shopEmail: form.shopEmail,
      currency: form.currency,
      receiptFooter: form.receiptFooter,
      receiptPrefix: form.receiptPrefix,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
    })
    onClose()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shop Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Shop Name *</label>
          <input
            type="text"
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            required
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 outline-none transition-all"
            placeholder="My Shop"
          />
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address</label>
          <input
            type="text"
            value={form.shopAddress}
            onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="123 Main Street, City"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
          <input
            type="tel"
            value={form.shopPhone}
            onChange={(e) => setForm({ ...form, shopPhone: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="+254 700 000 000"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
          <input
            type="email"
            value={form.shopEmail}
            onChange={(e) => setForm({ ...form, shopEmail: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="shop@example.com"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
          >
            <option value="KES">KES - Kenyan Shilling</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="TZS">TZS - Tanzanian Shilling</option>
            <option value="UGX">UGX - Ugandan Shilling</option>
          </select>
        </div>

        {/* Receipt Prefix */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Prefix</label>
          <input
            type="text"
            value={form.receiptPrefix}
            onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="INV"
          />
        </div>

        {/* Receipt Footer */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Footer Message</label>
          <textarea
            value={form.receiptFooter}
            onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
            rows={2}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none resize-none"
            placeholder="Thank you for shopping with us!"
          />
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Low Stock Alert</label>
          <input
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
          />
        </div>

        {/* M-Pesa Till Number */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">M-Pesa Till Number</label>
          <input
            type="text"
            value={form.mpesaTillNumber}
            onChange={(e) => setForm({ ...form, mpesaTillNumber: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="e.g. 123456"
          />
        </div>

        {/* M-Pesa Paybill Number */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">M-Pesa Paybill Number</label>
          <input
            type="text"
            value={form.mpesaPaybillNumber}
            onChange={(e) => setForm({ ...form, mpesaPaybillNumber: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="e.g. 123456"
          />
        </div>

        {/* M-Pesa Account Number */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">M-Pesa Account Number</label>
          <input
            type="text"
            value={form.mpesaAccountNumber}
            onChange={(e) => setForm({ ...form, mpesaAccountNumber: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={updateSettings.isPending}
          className="flex-1 py-4 bg-brand-orange text-white rounded-full font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
        >
          {updateSettings.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

// ========== PRINTER SETTINGS ==========

// ========== SCANNER SETTINGS ==========

const ScannerSettings: React.FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const [scannerType, setScannerType] = useState<'keyboard' | 'serial'>('keyboard')
  const [selectedPort, setSelectedPort] = useState('')
  const [baudRate, setBaudRate] = useState(9600)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const [ports, setPorts] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error' | 'auto'>('disconnected')
  const [autoDetectedPort, setAutoDetectedPort] = useState<string | null>(null)

  const loadPorts = async () => {
    try {
      const availablePorts = await window.electronAPI.hw.listSerialPorts()
      setPorts(availablePorts)
    } catch {
      setPorts([])
    }
  }

  useEffect(() => {
    loadPorts()
  }, [])

  // Load saved scanner type and port on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const type = await window.electronAPI.hw.getScannerType()
        setScannerType(type || 'keyboard')
        if (type === 'serial') {
          const savedPort = await window.electronAPI.hw.getSavedScannerPort()
          if (savedPort) {
            setAutoDetectedPort(savedPort)
            setSelectedPort(savedPort)
            setConnectionStatus('auto')
          }
        }
      } catch {}
    }
    checkStatus()
  }, [])

  const handleAutoDetect = async () => {
    setIsAutoDetecting(true)
    try {
      const result = await window.electronAPI.hw.autoDetectScanner()
      if (result) {
        setSelectedPort(result.port)
        setBaudRate(result.baudRate)
        setAutoDetectedPort(result.port)
        await window.electronAPI.hw.saveAutoDetectedScannerPort(result.port)
        await window.electronAPI.hw.setScannerType('serial')
        setScannerType('serial')
        // Auto-connect
        await window.electronAPI.hw.startSerialScanner(result.port, result.baudRate)
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    } catch {
      setConnectionStatus('error')
    } finally {
      setIsAutoDetecting(false)
    }
  }

  const handleConnect = async () => {
    if (!selectedPort) return
    setIsConnecting(true)
    try {
      await window.electronAPI.hw.saveAutoDetectedScannerPort(selectedPort)
      await window.electronAPI.hw.setScannerType('serial')
      setScannerType('serial')
      await window.electronAPI.hw.startSerialScanner(selectedPort, baudRate)
      setConnectionStatus('connected')
    } catch {
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await window.electronAPI.hw.stopSerialScanner()
    setConnectionStatus('disconnected')
  }

  const handleKeyboardMode = async () => {
    await window.electronAPI.hw.stopSerialScanner()
    await window.electronAPI.hw.setScannerType('keyboard')
    setScannerType('keyboard')
    setConnectionStatus('disconnected')
    setAutoDetectedPort(null)
    setSelectedPort('')
  }

  return (
    <div className="space-y-5">
      {/* Connection status */}
      <div className={`p-4 rounded-2xl flex items-center gap-3 ${
        connectionStatus === 'connected' ? 'bg-emerald-50' :
        connectionStatus === 'error' ? 'bg-red-50' : 'bg-slate-50'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          connectionStatus === 'connected' ? 'bg-emerald-100 text-emerald-600' :
          connectionStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'
        }`}>
          {connectionStatus === 'connected' ? <Wifi size={20} /> : <WifiOff size={20} />}
        </div>
        <div>
          <p className={`font-bold text-sm ${
            connectionStatus === 'connected' ? 'text-emerald-700' :
            connectionStatus === 'error' ? 'text-red-700' : 'text-slate-600'
          }`}>
            {connectionStatus === 'connected' ? 'Scanner Connected' :
             connectionStatus === 'error' ? 'Auto-Detect Failed' :
             connectionStatus === 'auto' ? 'Scanner Auto-Detected' : 'Not Connected'}
          </p>
          {autoDetectedPort && (
            <p className="text-xs text-slate-400">{autoDetectedPort}</p>
          )}
        </div>
        {connectionStatus === 'connected' && (
          <button
            onClick={handleDisconnect}
            className="ml-auto px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Scanner Type Toggle */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Scanner Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleKeyboardMode}
            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${
              scannerType === 'keyboard'
                ? 'border-brand-orange bg-orange-50 text-brand-orange'
                : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="text-xs font-bold">Keyboard Wedge</span>
            <span className="text-[10px] text-slate-400">Always active</span>
          </button>
          <button
            type="button"
            onClick={() => {}}
            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${
              scannerType === 'serial'
                ? 'border-brand-orange bg-orange-50 text-brand-orange'
                : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="text-xs font-bold">Serial Port</span>
            <span className="text-[10px] text-slate-400">RS232 / USB</span>
          </button>
        </div>
        {scannerType === 'keyboard' && (
          <p className="text-xs text-slate-500 mt-2 text-center">
            Keyboard wedge is always on. No setup needed — just scan.
          </p>
        )}
      </div>
      {/* Auto-detect button */}
      <button
        onClick={handleAutoDetect}
        disabled={isAutoDetecting}
        className="w-full py-4 bg-brand-orange text-white rounded-full font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
      >
        {isAutoDetecting ? <RefreshCw size={16} className="animate-spin" /> : <Usb size={16} />}
        {isAutoDetecting ? 'Detecting Scanner...' : 'Auto-Detect Scanner'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-slate-400 font-bold">OR MANUAL SETUP</span>
        </div>
      </div>

      {/* Port selection */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Serial Port</label>
        <select
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
        >
          <option value="">Select a port...</option>
          {ports.map((port) => (
            <option key={port} value={port}>{port}</option>
          ))}
        </select>
        <button
          onClick={loadPorts}
          className="mt-2 text-xs font-bold text-brand-orange hover:underline flex items-center gap-1"
        >
          <RefreshCw size={12} /> Refresh ports
        </button>
      </div>

      {/* Baud rate */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Baud Rate</label>
        <select
          value={baudRate}
          onChange={(e) => setBaudRate(parseInt(e.target.value))}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
        >
          <option value={9600}>9600</option>
          <option value={19200}>19200</option>
          <option value={38400}>38400</option>
          <option value={57600}>57600</option>
          <option value={115200}>115200</option>
        </select>
      </div>

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={!selectedPort || isConnecting || connectionStatus === 'connected'}
        className="w-full py-4 bg-brand-orange text-white rounded-full font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
      >
        {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <Usb size={16} />}
        {isConnecting ? 'Connecting...' : 'Connect Scanner'}
      </button>

      {/* Info */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500">
          <strong>Tip:</strong> Most USB barcode scanners work as keyboard wedge (no driver needed). 
          Enable "Barcode Scanner" in Shop Settings to use keyboard mode. 
          For RS232/serial scanners, use the auto-detect or manual setup above.
        </p>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="w-full py-3 bg-slate-100 text-slate-600 rounded-full font-bold"
      >
        Close
      </button>
    </div>
  )
}

// ========== PRINTER SETTINGS ==========

const PrinterSettings: React.FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const [printerType, setPrinterType] = useState<'escpos' | 'system'>('escpos')
  const [selectedPort, setSelectedPort] = useState('')
  const [baudRate, setBaudRate] = useState(9600)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [ports, setPorts] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')

  const loadPorts = async () => {
    try {
      const availablePorts = await window.electronAPI.hw.listSerialPorts()
      setPorts(availablePorts)
    } catch {
      setPorts([])
    }
  }

  useEffect(() => {
    loadPorts()
  }, [])

  const handleConnect = async () => {
    if (!selectedPort) return
    setIsConnecting(true)
    try {
      await window.electronAPI.hw.connectPrinter(selectedPort, baudRate)
      setConnectionStatus('connected')
    } catch {
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await window.electronAPI.hw.disconnectPrinter()
    setConnectionStatus('disconnected')
  }

  const handleTestPrint = async () => {
    setIsTesting(true)
    try {
      await window.electronAPI.hw.testPrint()
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Connection status */}
      <div className={`p-4 rounded-2xl flex items-center gap-3 ${
        connectionStatus === 'connected' ? 'bg-emerald-50' :
        connectionStatus === 'error' ? 'bg-red-50' : 'bg-slate-50'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          connectionStatus === 'connected' ? 'bg-emerald-100 text-emerald-600' :
          connectionStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'
        }`}>
          {connectionStatus === 'connected' ? <Wifi size={20} /> : <WifiOff size={20} />}
        </div>
        <div>
          <p className={`font-bold text-sm ${
            connectionStatus === 'connected' ? 'text-emerald-700' :
            connectionStatus === 'error' ? 'text-red-700' : 'text-slate-600'
          }`}>
            {connectionStatus === 'connected' ? 'Printer Connected' :
             connectionStatus === 'error' ? 'Connection Failed' : 'Not Connected'}
          </p>
          {selectedPort && (
            <p className="text-xs text-slate-400">{selectedPort} @ {baudRate} baud</p>
          )}
        </div>
        {connectionStatus === 'connected' && (
          <button
            onClick={handleDisconnect}
            className="ml-auto px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Printer type */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Printer Type</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'escpos', label: 'Thermal (ESC/POS)', icon: Printer },
            { value: 'system', label: 'System Print', icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPrinterType(value as any)}
              className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-colors ${
                printerType === value
                  ? 'border-brand-orange bg-orange-50 text-brand-orange'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              <Icon size={16} />
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {printerType === 'escpos' && (
        <>
          {/* Port selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Serial Port</label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            >
              <option value="">Select a port...</option>
              {ports.map((port) => (
                <option key={port} value={port}>{port}</option>
              ))}
            </select>
            <button
              onClick={loadPorts}
              className="mt-2 text-xs font-bold text-brand-orange hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh ports
            </button>
          </div>

          {/* Baud rate */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Baud Rate</label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(parseInt(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            >
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={115200}>115200</option>
            </select>
          </div>

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={!selectedPort || isConnecting || connectionStatus === 'connected'}
            className="w-full py-4 bg-brand-orange text-white rounded-full font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
          >
            {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <Usb size={16} />}
            {isConnecting ? 'Connecting...' : 'Connect Printer'}
          </button>

          {/* Test print */}
          {connectionStatus === 'connected' && (
            <button
              onClick={handleTestPrint}
              disabled={isTesting}
              className="w-full py-3 bg-slate-100 text-slate-600 rounded-full font-bold flex items-center justify-center gap-2"
            >
              {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />}
              {isTesting ? 'Printing...' : 'Test Print'}
            </button>
          )}
        </>
      )}

      {printerType === 'system' && (
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-sm font-semibold text-slate-600">
            System print dialog will open when you print a receipt. No additional configuration needed.
          </p>
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="w-full py-3 bg-slate-100 text-slate-600 rounded-full font-bold"
      >
        Close
      </button>
    </div>
  )
}

// ========== PAYMENT SETTINGS ==========

type PaymentType = 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi'

const PAYMENT_TYPES: { value: PaymentType; label: string; hint: string }[] = [
  { value: 'sendMoney', label: 'Send Money (Phone Number)', hint: 'Customer sends money to your phone number' },
  { value: 'mpesaPaybill', label: 'M-Pesa Paybill', hint: 'Customer pays via M-Pesa paybill number + account' },
  { value: 'bankPaybill', label: 'Bank Paybill', hint: 'Customer pays via bank paybill number + account' },
  { value: 'pochi', label: 'Pochi La Biashara (Phone)', hint: 'Customer pays via Pochi to your phone number' },
]

const PaymentSettings: React.FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { data: settings, isLoading } = useShopSettings()
  const updateSettings = useUpdateShopSettings()

  // Determine which payment type is currently configured
  const getCurrentPaymentType = (): PaymentType => {
    if (settings?.mpesaSendMoneyPhone) return 'sendMoney'
    if (settings?.mpesaPaybillNumber) return 'mpesaPaybill'
    if (settings?.bankPaybillNumber) return 'bankPaybill'
    if (settings?.mpesaPochiPhone) return 'pochi'
    return 'sendMoney'
  }

  const [paymentType, setPaymentType] = useState<PaymentType>('sendMoney')
  const [phone, setPhone] = useState('')
  const [paybillNumber, setPaybillNumber] = useState('')
  const [paybillAccount, setPaybillAccount] = useState('')

  useEffect(() => {
    if (settings) {
      setPaymentType(getCurrentPaymentType())
      setPhone(settings.mpesaSendMoneyPhone || settings.mpesaPochiPhone || '')
      setPaybillNumber(settings.mpesaPaybillNumber || settings.bankPaybillNumber || '')
      setPaybillAccount(settings.mpesaPaybillAccount || settings.bankPaybillAccount || '')
    }
  }, [settings])

  // When payment type changes, clear unrelated fields
  const handleTypeChange = (type: PaymentType) => {
    setPaymentType(type)
    setPhone('')
    setPaybillNumber('')
    setPaybillAccount('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings.mutateAsync({
      mpesaSendMoneyPhone: paymentType === 'sendMoney' ? phone : '',
      mpesaPaybillNumber: paymentType === 'mpesaPaybill' ? paybillNumber : '',
      mpesaPaybillAccount: paymentType === 'mpesaPaybill' ? paybillAccount : '',
      bankPaybillNumber: paymentType === 'bankPaybill' ? paybillNumber : '',
      bankPaybillAccount: paymentType === 'bankPaybill' ? paybillAccount : '',
      mpesaPochiPhone: paymentType === 'pochi' ? phone : '',
    })
    onClose()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 bg-green-50 rounded-xl text-sm text-slate-600">
        Select one payment method. Only the method you choose will appear at checkout for customers.
      </div>

      {/* Payment Type Dropdown */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Method</label>
        <select
          value={paymentType}
          onChange={(e) => handleTypeChange(e.target.value as PaymentType)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
        >
          {PAYMENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">
          {PAYMENT_TYPES.find(t => t.value === paymentType)?.hint}
        </p>
      </div>

      {/* Fields based on selected type */}
      {paymentType === 'sendMoney' && (
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="e.g. 0741234567"
            required
          />
        </div>
      )}

      {paymentType === 'mpesaPaybill' && (
        <>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paybill Number</label>
            <input
              type="text"
              value={paybillNumber}
              onChange={(e) => setPaybillNumber(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
              placeholder="e.g. 123456"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Account Number</label>
            <input
              type="text"
              value={paybillAccount}
              onChange={(e) => setPaybillAccount(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
              placeholder="e.g. BUSINESS001"
              required
            />
          </div>
        </>
      )}

      {paymentType === 'bankPaybill' && (
        <>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Paybill Number</label>
            <input
              type="text"
              value={paybillNumber}
              onChange={(e) => setPaybillNumber(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
              placeholder="e.g. 123456"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Account Number</label>
            <input
              type="text"
              value={paybillAccount}
              onChange={(e) => setPaybillAccount(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
              placeholder="e.g. BUSINESS001"
              required
            />
          </div>
        </>
      )}

      {paymentType === 'pochi' && (
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pochi Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
            placeholder="e.g. 0741234567"
            required
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={updateSettings.isPending}
          className="flex-1 py-4 bg-brand-orange text-white rounded-full font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
        >
          {updateSettings.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

// ========== DATA MANAGEMENT ==========

const DataManagement: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const filePath = await window.electronAPI.app.showSaveDialog({
        title: 'Export Database',
        defaultPath: `soostori-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (filePath) {
        await window.electronAPI.app.exportDatabase(filePath)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const files = await window.electronAPI.app.showOpenDialog({
        title: 'Import Database',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      })
      if (files && files.length > 0) {
        await window.electronAPI.app.importDatabase(files[0])
      }
    } catch (err) {
      console.error('Import failed:', err)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-800">Backup your data regularly</p>
            <p className="text-xs text-amber-700 mt-0.5">Export creates a JSON backup of all your products, sales, and settings.</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full py-4 bg-brand-orange text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
      >
        {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
        {isExporting ? 'Exporting...' : 'Export Data'}
      </button>

      <button
        onClick={handleImport}
        disabled={isImporting}
        className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:border-brand-orange transition-colors"
      >
        {isImporting ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
        {isImporting ? 'Importing...' : 'Import Data'}
      </button>

      <div className="pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          Data is stored locally on this device. Export regularly to avoid data loss.
        </p>
      </div>
    </div>
  )
}

// ========== ABOUT ==========

const About: React.FC = () => {
  const [version, setVersion] = useState('')
  const platform = window.electronAPI.app.getPlatform()

  useEffect(() => {
    window.electronAPI.app.getVersion().then(setVersion)
  }, [])

  return (
    <div className="space-y-6 text-center">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-brand-orange rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200">
          <Store size={40} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Soostori POS</h2>
          <p className="text-sm text-slate-400">Point of Sale Desktop App</p>
        </div>
      </div>

      {/* Version info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Version</p>
          <p className="text-lg font-black text-slate-700 mt-1">{version || '1.0.0'}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Platform</p>
          <p className="text-lg font-black text-slate-700 mt-1 capitalize">{platform}</p>
        </div>
      </div>

      <div className="p-4 bg-orange-50 rounded-xl">
        <p className="text-sm font-semibold text-brand-orange">
          Built with Electron + React
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Offline-first SQLite database
        </p>
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <p>© 2024 Soostori. All rights reserved.</p>
        <p>Powered by Soostori Technologies</p>
      </div>
    </div>
  )
}

// ========== MODAL WRAPPER ==========

const Modal: React.FC<{
  title: string
  subtitle?: string
  icon: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}> = ({ title, subtitle, icon, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] flex flex-col animate-scale-in">
      <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center text-white">
            {icon}
          </div>
          <div>
            <h2 className="font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
          <X size={20} className="text-slate-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  </div>
)

// ========== MAIN SETTINGS PAGE ==========

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const sections = [
    {
      id: 'shop',
      icon: <Store size={22} />,
      title: 'Shop Details',
      description: 'Name, address, phone, currency',
      badge: 'Required',
      badgeColor: 'bg-red-50 text-red-600',
    },
    {
      id: 'payment',
      icon: <CreditCard size={22} />,
      title: 'Payment Settings',
      description: 'M-Pesa Till, Paybill, Account',
    },
    {
      id: 'scanner',
      icon: <Scan size={22} />,
      title: 'Barcode Scanner',
      description: 'Keyboard wedge or serial port',
    },
    {
      id: 'printer',
      icon: <Printer size={22} />,
      title: 'Printer Setup',
      description: 'ESC/POS thermal or system print',
    },
    {
      id: 'data',
      icon: <Database size={22} />,
      title: 'Data Management',
      description: 'Export and import your data',
    },
    {
      id: 'about',
      icon: <Info size={22} />,
      title: 'About',
      description: 'App version and information',
    },
  ]

  return (
    <div className="h-full bg-soft-yellow flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="bg-white px-4 md:px-5 py-3.5 flex items-center gap-3 border-b border-slate-200 shrink-0">
        <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center text-white">
          <Shield size={18} />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800">Settings</h1>
          <p className="text-xs text-slate-400">Configure your shop</p>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            icon={section.icon}
            title={section.title}
            description={section.description}
            badge={section.badge}
            badgeColor={section.badgeColor}
            onClick={() => setActiveSection(section.id)}
          />
        ))}
      </div>

      {/* Modals */}
      {activeSection === 'shop' && (
        <Modal
          title="Shop Details"
          subtitle="Name, address, phone, currency, receipt settings"
          icon={<Store size={20} />}
          onClose={() => setActiveSection(null)}
        >
          <ShopSettingsForm onClose={() => setActiveSection(null)} />
        </Modal>
      )}

      {activeSection === 'payment' && (
        <Modal
          title="Payment Settings"
          subtitle="M-Pesa Till, Paybill, and Account numbers"
          icon={<CreditCard size={20} />}
          onClose={() => setActiveSection(null)}
        >
          <PaymentSettings onClose={() => setActiveSection(null)} />
        </Modal>
      )}

      {activeSection === 'scanner' && (
        <Modal
          title="Barcode Scanner"
          subtitle="Configure your barcode scanner"
          icon={<Scan size={20} />}
          onClose={() => setActiveSection(null)}
        >
          <ScannerSettings onClose={() => setActiveSection(null)} />
        </Modal>
      )}

      {activeSection === 'printer' && (
        <Modal
          title="Printer Setup"
          subtitle="Configure your receipt printer"
          icon={<Printer size={20} />}
          onClose={() => setActiveSection(null)}
        >
          <PrinterSettings onClose={() => setActiveSection(null)} />
        </Modal>
      )}

      {activeSection === 'data' && (
        <Modal
          title="Data Management"
          subtitle="Backup and restore your data"
          icon={<Database size={20} />}
          onClose={() => setActiveSection(null)}
        >
          <DataManagement />
        </Modal>
      )}

      {activeSection === 'about' && (
        <Modal
          title="About"
          subtitle="App information"
          icon={<Info size={20} />}
          onClose={() => setActiveSection(null)}
        >
          <About />
        </Modal>
      )}
    </div>
  )
}

export default Settings
