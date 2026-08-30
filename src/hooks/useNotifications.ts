import { useCallback, useEffect, useState } from 'react'

export type NotificationKind = 'update_available' | 'sync_complete' | 'offline' | 'online' | 'low_stock' | 'info'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  message?: string
  timestamp: number
  read: boolean
  version?: string
  productName?: string
  stockQuantity?: number
}

const STORAGE_KEY = 'soostori_notifications'
const MAX_NOTIFICATIONS = 100

function loadFromStorage(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as NotificationItem[]
    return parsed.map(n => ({ ...n, timestamp: Number(n.timestamp) }))
  } catch {
    return []
  }
}

function saveToStorage(items: NotificationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadFromStorage())

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(notifications)
  }, [notifications])

  // Listen for low-stock events from the main process via custom DOM event
  useEffect(() => {
    const handler = (event: Event) => {
      const { productName, stock } = (event as CustomEvent<{ productName: string; stock: number }>).detail
      addNotification({
        kind: 'low_stock',
        message: `${productName} is low on stock (${stock} remaining)`,
        productName,
        stockQuantity: stock,
      })
    }
    window.addEventListener('soostori:low-stock', handler)
    return () => window.removeEventListener('soostori:low-stock', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addNotification = useCallback((item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newItem: NotificationItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      read: false,
    }
    setNotifications(prev => [newItem, ...prev].slice(0, MAX_NOTIFICATIONS))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, addNotification, markRead, markAllRead, clearAll, dismiss, unreadCount }
}
