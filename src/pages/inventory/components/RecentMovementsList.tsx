import { ArrowDownLeft, ArrowUpRight, Minus, RefreshCw, RotateCcw, Package } from 'lucide-react'
import type { StockMovement } from '../../../lib/types'

interface RecentMovementsProps {
  movements: StockMovement[]
}

function MovementIcon({ type }: { type: string }) {
  const props = { size: 11 }
  switch (type) {
    case 'received':
      return <ArrowDownLeft size={props.size} className="text-emerald-500" />
    case 'sold':
      return <ArrowUpRight size={props.size} className="text-blue-500" />
    case 'adjusted':
      return <RefreshCw size={props.size} className="text-amber-500" />
    case 'transferred':
      return <RefreshCw size={props.size} className="text-violet-500" />
    case 'returned':
      return <RotateCcw size={props.size} className="text-cyan-500" />
    default:
      return <Package size={props.size} className="text-slate-400" />
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const RecentMovementsList: React.FC<RecentMovementsProps> = ({ movements }) => {
  if (movements.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
        No recent movements
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {movements.slice(0, 20).map(movement => (
        <div key={movement.id} className="px-4 py-2.5 flex items-center gap-2.5">
          <MovementIcon type={movement.type} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {movement.productName ?? 'Unknown product'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {movement.reason ?? movement.type} · {formatRelativeTime(movement.createdAt)}
            </p>
          </div>
          <span className={`text-xs font-bold shrink-0 ${
            movement.quantity >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
          </span>
        </div>
      ))}
    </div>
  )
}
