import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Package } from 'lucide-react'

export interface LowStockAlertItem {
  productId: string
  productName: string
  currentStock: number
  threshold: number
}

interface LowStockAlertsProps {
  alerts: LowStockAlertItem[]
  onRestock?: (productId: string) => void
  collapsed?: boolean
}

export const LowStockAlerts: React.FC<LowStockAlertsProps> = ({ alerts, onRestock, collapsed = false }) => {
  const [expanded, setExpanded] = useState(false)

  if (alerts.length === 0) return null

  const mostUrgent = alerts.slice(0, 3)
  const displayAlerts = collapsed && !expanded ? mostUrgent : alerts
  const hiddenCount = alerts.length - mostUrgent.length

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
            {alerts.length} product{alerts.length !== 1 ? 's' : ''} low on stock
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {collapsed && alerts.length > mostUrgent.length && (
            <span className="text-[10px] text-amber-500 dark:text-amber-500 font-semibold">
              +{hiddenCount} more
            </span>
          )}
          {collapsed && (
            expanded ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />
          )}
        </div>
      </button>

      {(!collapsed || expanded) && (
        <div className="mt-2 space-y-1.5">
          {displayAlerts.map(alert => {
            const urgency = alert.currentStock === 0 ? 'out' : 'low'
            return (
              <div key={alert.productId} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Package size={11} className={`shrink-0 ${urgency === 'out' ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className={`text-xs truncate ${
                    urgency === 'out'
                      ? 'text-red-700 dark:text-red-300 font-semibold'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {alert.productName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold ${
                    urgency === 'out'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {alert.currentStock}/{alert.threshold}
                  </span>
                  {onRestock && (
                    <button
                      onClick={() => onRestock(alert.productId)}
                      className="text-[10px] font-bold text-brand-orange hover:text-orange-600 transition-colors"
                    >
                      Restock
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
