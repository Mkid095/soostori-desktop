import { useCallback, useState } from 'react'
import type { ToastItem } from '../components/ToastContainer'
import type { ToastVariant } from '../components/Toast'

export interface ToastController {
  toasts: ToastItem[]
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
}

export function useToastController(): ToastController {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, dismissToast }
}
