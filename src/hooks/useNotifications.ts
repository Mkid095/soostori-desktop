import { useCallback, useEffect, useState } from 'react'
import type { UpdateStatusData } from '../lib/types/api'

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

/** Map SDK notification priority to hook notification kind. */
function priorityToKind(priority: string): NotificationKind {
  if (priority === 'urgent' || priority === 'high') return 'info'
  return 'info'
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

  const addNotification = useCallback((item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newItem: NotificationItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      read: false,
    }
    setNotifications(prev => [newItem, ...prev].slice(0, MAX_NOTIFICATIONS))
  }, [])

  // Listen for low-stock events from the main process
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
  }, [addNotification])

  // Listen for browser online/offline
  useEffect(() => {
    const handleOnline = () => addNotification({ kind: 'online' })
    const handleOffline = () => addNotification({ kind: 'offline' })
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addNotification])

  // Listen for sync events
  useEffect(() => {
    const handleSyncComplete = () => addNotification({ kind: 'sync_complete' })
    window.addEventListener('soostori-sync-complete', handleSyncComplete)
    return () => window.removeEventListener('soostori-sync-complete', handleSyncComplete)
  }, [addNotification])

  // Listen for update events from the updater
  useEffect(() => {
    const handleUpdate = (data: UpdateStatusData) => {
      if (data.state === 'UPDATE_AVAILABLE') {
        addNotification({
          kind: 'update_available',
          message: `Version ${data.availableVersion || 'new'} is available.`,
          version: data.availableVersion,
        })
      }
    }
    const unsubscribe = window.electronAPI?.updater?.onStatus(handleUpdate)
    return () => unsubscribe?.()
  }, [addNotification])

  // Listen for sale completed — notification system gets wired here
  useEffect(() => {
    const handleSaleCompleted = (event: Event) => {
      const { saleId, total } = (event as CustomEvent<{ saleId: string; total: number }>).detail
      addNotification({
        kind: 'info',
        message: `Sale completed: ${total.toFixed(2)}`,
      })
    }
    window.addEventListener('soostori:sale-completed', handleSaleCompleted)
    return () => window.removeEventListener('soostori:sale-completed', handleSaleCompleted)
  }, [addNotification])

  // @soostori/notifications engine — unified notification from SDK channels (in-app, etc.)
  useEffect(() => {
    const handleSdkNotification = (event: Event) => {
      const { id, title, body, priority, timestamp } = (
        event as CustomEvent<{ id: string; title: string; body: string; priority: string; timestamp: number }>
      ).detail
      addNotification({
        kind: priorityToKind(priority),
        message: body,
        timestamp,
      } as Omit<NotificationItem, 'id' | 'timestamp' | 'read'>)
    }
    window.addEventListener('soostori:notification', handleSdkNotification)
    return () => window.removeEventListener('soostori:notification', handleSdkNotification)
  }, [addNotification])

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
