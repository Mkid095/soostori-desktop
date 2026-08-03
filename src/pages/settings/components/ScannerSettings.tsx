import React, { useState, useEffect } from 'react'
import { Usb } from 'lucide-react'
import { ConnectionStatus, ActionButton, PortSelect, BaudRateSelect } from './SharedButtons'

interface ScannerSettingsProps {
  onClose: () => void
}

const ScannerSettings: React.FC<ScannerSettingsProps> = ({ onClose }) => {
  const [scannerType, setScannerType] = useState<'keyboard' | 'serial'>('keyboard')
  const [selectedPort, setSelectedPort] = useState('')
  const [baudRate, setBaudRate] = useState(9600)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const [ports, setPorts] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error' | 'auto'>('disconnected')
  const [autoDetectedPort, setAutoDetectedPort] = useState<string | null>(null)

  const loadPorts = async () => {
    try { setPorts(await window.electronAPI.hw.listSerialPorts()) }
    catch { setPorts([]) }
  }

  useEffect(() => { loadPorts() }, [])

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const type = await window.electronAPI.hw.getScannerType()
        setScannerType(type || 'keyboard')
        if (type === 'serial') {
          const savedPort = await window.electronAPI.hw.getSavedScannerPort()
          if (savedPort) { setAutoDetectedPort(savedPort); setSelectedPort(savedPort); setConnectionStatus('auto') }
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
        setSelectedPort(result.port); setBaudRate(result.baudRate); setAutoDetectedPort(result.port)
        await window.electronAPI.hw.saveAutoDetectedScannerPort(result.port)
        await window.electronAPI.hw.setScannerType('serial'); setScannerType('serial')
        await window.electronAPI.hw.startSerialScanner(result.port, result.baudRate)
        setConnectionStatus('connected')
      } else { setConnectionStatus('error') }
    } catch { setConnectionStatus('error') }
    finally { setIsAutoDetecting(false) }
  }

  const handleConnect = async () => {
    if (!selectedPort) return
    setIsConnecting(true)
    try {
      await window.electronAPI.hw.saveAutoDetectedScannerPort(selectedPort)
      await window.electronAPI.hw.setScannerType('serial'); setScannerType('serial')
      await window.electronAPI.hw.startSerialScanner(selectedPort, baudRate)
      setConnectionStatus('connected')
    } catch { setConnectionStatus('error') }
    finally { setIsConnecting(false) }
  }

  const handleDisconnect = async () => { await window.electronAPI.hw.stopSerialScanner(); setConnectionStatus('disconnected') }
  const handleKeyboardMode = async () => {
    await window.electronAPI.hw.stopSerialScanner(); await window.electronAPI.hw.setScannerType('keyboard')
    setScannerType('keyboard'); setConnectionStatus('disconnected'); setAutoDetectedPort(null); setSelectedPort('')
  }

  return (
    <div className="space-y-5">
      <ConnectionStatus status={connectionStatus} port={autoDetectedPort || undefined} onDisconnect={handleDisconnect} />

      <div className="p-4 bg-slate-50 rounded-xl">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Scanner Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleKeyboardMode} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${scannerType === 'keyboard' ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 text-slate-500'}`}>
            <span className="text-xs font-bold">Keyboard Wedge</span><span className="text-[10px] text-slate-400">Always active</span>
          </button>
          <button className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${scannerType === 'serial' ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 text-slate-500'}`}>
            <span className="text-xs font-bold">Serial Port</span><span className="text-[10px] text-slate-400">RS232 / USB</span>
          </button>
        </div>
        {scannerType === 'keyboard' && <p className="text-xs text-slate-500 mt-2 text-center">Keyboard wedge is always on. No setup needed.</p>}
      </div>

      <ActionButton onClick={handleAutoDetect} disabled={isAutoDetecting} loading={isAutoDetecting} icon={<Usb size={16} />} label={isAutoDetecting ? 'Detecting...' : 'Auto-Detect Scanner'} />

      <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400 font-bold">OR MANUAL SETUP</span></div></div>

      <PortSelect ports={ports} selectedPort={selectedPort} onPortChange={setSelectedPort} onRefresh={loadPorts} />
      <BaudRateSelect value={baudRate} onChange={setBaudRate} />
      <ActionButton onClick={handleConnect} disabled={!selectedPort || isConnecting || connectionStatus === 'connected'} loading={isConnecting} icon={<Usb size={16} />} label={isConnecting ? 'Connecting...' : 'Connect Scanner'} />

      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500"><strong>Tip:</strong> Most USB barcode scanners work as keyboard wedge. For RS232/serial scanners, use auto-detect or manual setup.</p>
      </div>
      <ActionButton onClick={onClose} icon={<></>} label="Close" variant="secondary" />
    </div>
  )
}

export default ScannerSettings
