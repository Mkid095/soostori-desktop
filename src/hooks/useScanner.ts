import { useEffect, useRef, useState, useCallback } from 'react'

// ========== BARCODE SCANNER HOOK ==========
// Handles both hardware serial scanner and keyboard wedge
//
// KEY FIX: onScan is stored in a ref so the useEffect dependency array is
// empty. This prevents duplicate listeners from accumulating when onScan
// reference changes (which happens every time allProducts or addToCart change).
export function useScanner(onScan: (barcode: string) => void) {
  const buf = useRef('')
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onScanRef = useRef(onScan)
  const [scannerStatus, setScannerStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')
  const [autoDetectedPort, setAutoDetectedPort] = useState<string | null>(null)

  // Keep onScan ref current without re-running the effect
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  // Keyboard wedge scanner — runs once (no deps), uses ref for stable callback
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter') {
        if (buf.current.length >= 3) onScanRef.current(buf.current)
        buf.current = ''
        return
      }
      if (/^[a-zA-Z0-9\-]$/.test(e.key)) {
        buf.current += e.key
        if (t.current) clearTimeout(t.current)
        t.current = setTimeout(() => { buf.current = '' }, 100)
      }
    }
    window.addEventListener('keydown', h)
    return () => {
      window.removeEventListener('keydown', h)
      buf.current = ''
      if (t.current) clearTimeout(t.current)
    }
  }, []) // <-- empty deps, effect runs once

  // Hardware serial scanner - only auto-connect if scanner type is 'serial'
  useEffect(() => {
    if (!window.electronAPI?.hw) return

    let mounted = true

    const connectScanner = async () => {
      try {
        const savedType = await window.electronAPI.hw.getScannerType()
        if (savedType !== 'serial') return // keyboard wedge is always on via keydown listener

        // Try auto-detect first
        const detected = await window.electronAPI.hw.autoDetectScanner()
        if (detected && mounted) {
          setAutoDetectedPort(detected.port)
          await window.electronAPI.hw.startSerialScanner(detected.port, detected.baudRate)
          if (mounted) setScannerStatus('connected')
          return
        }

        // Try previously saved port
        try {
          const savedPort = await window.electronAPI.hw.getSavedScannerPort()
          if (savedPort && mounted) {
            await window.electronAPI.hw.startSerialScanner(savedPort, 9600)
            if (mounted) setScannerStatus('connected')
            return
          }
        } catch {}

        if (mounted) setScannerStatus('disconnected')
      } catch {
        if (mounted) setScannerStatus('error')
      }
    }

    connectScanner()

    // Listen for hardware scanner barcodes — uses ref for stable callback
    const unsubscribe = window.electronAPI.hw.onBarcodeScanned((barcode: string) => {
      if (barcode.length > 0) onScanRef.current(barcode)
    })

    return () => {
      mounted = false
      unsubscribe()
      window.electronAPI.hw?.stopSerialScanner().catch(() => {})
    }
  }, []) // <-- empty deps, effect runs once

  const connectManual = useCallback(async (port: string, baudRate: number) => {
    if (!window.electronAPI?.hw) return
    try {
      await window.electronAPI.hw.startSerialScanner(port, baudRate)
      setScannerStatus('connected')
      setAutoDetectedPort(port)
    } catch {
      setScannerStatus('error')
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (!window.electronAPI?.hw) return
    await window.electronAPI.hw.stopSerialScanner()
    setScannerStatus('disconnected')
  }, [])

  return { scannerStatus, autoDetectedPort, connectManual, disconnect }
}
