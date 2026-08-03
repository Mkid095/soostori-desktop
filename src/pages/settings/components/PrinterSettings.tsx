import React, { useState, useEffect } from 'react'
import { Printer, Monitor, Usb } from 'lucide-react'
import { ConnectionStatus, ActionButton, PortSelect, BaudRateSelect } from './SharedButtons'
import { useTranslation } from '../../../lib/useTranslation'

interface PrinterSettingsProps {
  onClose: () => void
}

const PrinterSettings: React.FC<PrinterSettingsProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const [printerType, setPrinterType] = useState<'escpos' | 'system'>('escpos')
  const [selectedPort, setSelectedPort] = useState('')
  const [baudRate, setBaudRate] = useState(9600)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [ports, setPorts] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')

  const loadPorts = async () => { try { setPorts(await window.electronAPI.hw.listSerialPorts()) } catch { setPorts([]) } }
  useEffect(() => { loadPorts() }, [])

  const handleConnect = async () => {
    if (!selectedPort) return
    setIsConnecting(true)
    try { await window.electronAPI.hw.connectPrinter(selectedPort, baudRate); setConnectionStatus('connected') }
    catch { setConnectionStatus('error') }
    finally { setIsConnecting(false) }
  }

  const handleDisconnect = async () => { await window.electronAPI.hw.disconnectPrinter(); setConnectionStatus('disconnected') }
  const handleTestPrint = async () => { setIsTesting(true); try { await window.electronAPI.hw.testPrint() } finally { setIsTesting(false) } }

  const printerTypes = [
    { value: 'escpos', labelKey: 'set.thermalEscPos', icon: Printer },
    { value: 'system', labelKey: 'set.systemPrint', icon: Monitor },
  ]

  return (
    <div className="space-y-5">
      <ConnectionStatus status={connectionStatus} port={selectedPort ? `${selectedPort} @ ${baudRate} baud` : undefined} onDisconnect={handleDisconnect} />

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('set.printerType')}</label>
        <div className="grid grid-cols-2 gap-2">
          {printerTypes.map(({ value, labelKey, icon: Icon }) => (
            <button key={value} onClick={() => setPrinterType(value as 'escpos' | 'system')} className={`p-3 rounded-xl border-2 flex items-center gap-2 ${printerType === value ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 text-slate-500'}`}>
              <Icon size={16} /><span className="text-xs font-bold">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {printerType === 'escpos' && (
        <>
          <PortSelect ports={ports} selectedPort={selectedPort} onPortChange={setSelectedPort} onRefresh={loadPorts} />
          <BaudRateSelect value={baudRate} onChange={setBaudRate} />
          <ActionButton onClick={handleConnect} disabled={!selectedPort || isConnecting || connectionStatus === 'connected'} loading={isConnecting} icon={<Usb size={16} />} label={isConnecting ? t('set.connecting') : t('set.connectPrinter')} />
          {connectionStatus === 'connected' && (
            <ActionButton onClick={handleTestPrint} disabled={isTesting} loading={isTesting} icon={<Printer size={14} />} label={isTesting ? t('set.printing') : t('set.testPrint')} variant="secondary" />
          )}
        </>
      )}

      {printerType === 'system' && (
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-sm font-semibold text-slate-600">{t('set.systemPrintDialog')}</p>
        </div>
      )}

      <ActionButton onClick={onClose} icon={<></>} label={t('action.close')} variant="secondary" />
    </div>
  )
}

export default PrinterSettings
