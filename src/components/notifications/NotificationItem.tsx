/**
 * NotificationItem.tsx — Single notification row with icon, body, actions.
 */

import React from 'react'
import {
  ShoppingCart, RefreshCw, DollarSign, Package,
  Users, Monitor, TrendingUp, AlertCircle, Info,
  Check, X, Bell
} from 'lucide-react'
import type { NotificationRecord } from '../../../electron/preload/ipc-signatures-db'

export type { NotificationRecord }

interface NotificationItemProps {
  notification: NotificationRecord
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}

const iconFor = (eventType: string, priority: string) => {
  const base = 'shrink-0'
  if (eventType.startsWith('sale.')) return { icon: <ShoppingCart size={15} />, cls: 'text-blue-500' }
  if (eventType.startsWith('debt.')) return { icon: <DollarSign size={15} />, cls: 'text-amber-500' }
  if (eventType.startsWith('inventory.')) return { icon: <Package size={15} />, cls: 'text-orange-500' }
  if (eventType.startsWith('team.')) return { icon: <Users size={15} />, cls: 'text-violet-500' }
  if (eventType.startsWith('device.')) return { icon: <Monitor size={15} />, cls: 'text-slate-500' }
  if (eventType.startsWith('commission.')) return { icon: <TrendingUp size={15} />, cls: 'text-emerald-500' }
  if (eventType.startsWith('expense.')) return { icon: <DollarSign size={15} />, cls: 'text-rose-500' }
  if (priority === 'urgent' || priority === 'high') return { icon: <AlertCircle size={15} />, cls: 'text-red-500' }
  return { icon: <Info size={15} />, cls: 'text-slate-400' }
}

const labelFor = (eventType: string): string => {
  const map: Record<string, string> = {
    'sale.created': 'Sale completed',
    'sale.refunded': 'Refund processed',
    'debt.created': 'New debt added',
    'debt.payment_recorded': 'Debt payment received',
    'debt.settled': 'Debt settled',
    'expense.created': 'Expense logged',
    'expense.approved': 'Expense approved',
    'expense.paid': 'Expense paid',
    'inventory.low_stock': 'Low stock alert',
    'inventory.received': 'Stock received',
    'inventory.adjusted': 'Stock adjusted',
    'team.invitation_sent': 'Invitation sent',
    'team.member_added': 'Member joined',
    'team.role_changed': 'Role updated',
    'device.enrolled': 'Device enrolled',
    'device.approved': 'Device approved',
    'device.revoked': 'Device revoked',
    'device.primary_changed': 'Primary device changed',
    'commission.created': 'Commission earned',
    'commission.paid': 'Commission paid',
    'sync.complete': 'Sync complete',
    'system.error': 'System error',
  }
  return map[eventType] ?? eventType
}

const formatDate = (ts: string) => {
  const d = new Date(ts)
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDismiss,
}) => {
  const { icon, cls } = iconFor(notification.event_type, notification.priority)
  const isUnread = !notification.read_at
  const label = labelFor(notification.event_type)

  const message = String(
    notification.payload?.message
    ?? notification.payload?.title
    ?? label
    ?? ''
  )

  return (
    <div className={`flex gap-3 px-4 py-3.5 transition-colors ${isUnread ? '' : 'opacity-60'}`}>
      <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 ${cls}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
          {isUnread && (
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{message}</p>
        <p className="mt-1 text-[10px] text-slate-400">{formatDate(notification.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {isUnread && (
          <button
            onClick={() => onMarkRead(notification.id)}
            aria-label="Mark read"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950/40"
          >
            <Check size={12} />
          </button>
        )}
        <button
          onClick={() => onDismiss(notification.id)}
          aria-label="Dismiss"
          className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

export default NotificationItem
