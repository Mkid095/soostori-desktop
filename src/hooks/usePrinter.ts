import { useCallback } from 'react'

interface ReceiptData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  receiptNumber: string
  date: string
  items: {
    name: string
    quantity: number
    unitPrice: number
    total: number
    variation?: string
  }[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  cashierName?: string
  footerMessage?: string
}

export function usePrinter() {
  const printReceipt = useCallback(async (data: ReceiptData) => {
    if (!window.electronAPI?.hw) {
      console.error('Electron API not available')
      return
    }
    await window.electronAPI.hw.printReceipt(data)
  }, [])

  const printViaSystemDialog = useCallback(async (html: string) => {
    if (!window.electronAPI?.hw) {
      console.error('Electron API not available')
      return
    }
    await window.electronAPI.hw.printViaSystemDialog(html)
  }, [])

  const listPorts = useCallback(async () => {
    if (!window.electronAPI?.hw) return []
    return window.electronAPI.hw.listSerialPorts()
  }, [])

  const connectPrinter = useCallback(async (port: string, baudRate: number) => {
    if (!window.electronAPI?.hw) return
    await window.electronAPI.hw.connectPrinter(port, baudRate)
  }, [])

  const disconnectPrinter = useCallback(async () => {
    if (!window.electronAPI?.hw) return
    await window.electronAPI.hw.disconnectPrinter()
  }, [])

  const testPrint = useCallback(async () => {
    if (!window.electronAPI?.hw) return
    await window.electronAPI.hw.testPrint()
  }, [])

  return {
    printReceipt,
    printViaSystemDialog,
    listPorts,
    connectPrinter,
    disconnectPrinter,
    testPrint,
  }
}
