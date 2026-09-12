/**
 * CommissionSummaryCard.tsx — Phase 19: Commission totals summary for partner dashboard.
 */

import React, { useMemo } from 'react'
import { TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { calculateCommission, formatKES } from '../../lib/commission-calculator'
import type { SalespersonPackage } from '../../../electron/services/cloud-entity-commission'

interface Props {
  packages: SalespersonPackage[]
}

export function CommissionSummaryCard({ packages }: Props) {
  const summary = useMemo(() => {
    let totalEarned = 0
    let activeCount = 0
    let pendingValue = 0

    for (const pkg of packages) {
      const c = calculateCommission(pkg.amount)
      totalEarned += c.salespersonShare
      if (pkg.isActive) {
        activeCount++
        pendingValue += pkg.amount
      }
    }
    const pendingCommission = pendingValue > 0 ? calculateCommission(pendingValue).salespersonShare : 0
    return { totalEarned, activeCount, pendingCommission, businessCount: packages.length }
  }, [packages])

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-brand-orange" />
        <span className="text-xs font-bold text-text-muted uppercase tracking-wide">Commission Summary</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <CheckCircle size={14} className="mx-auto mb-1 text-green-500" />
          <p className="text-lg font-bold text-green-600">{formatKES(summary.totalEarned)}</p>
          <p className="text-[10px] text-text-muted uppercase">Total Earned</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <Clock size={14} className="mx-auto mb-1 text-amber-500" />
          <p className="text-lg font-bold text-amber-600">{formatKES(summary.pendingCommission)}</p>
          <p className="text-[10px] text-text-muted uppercase">Pending</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{summary.activeCount}</p>
          <p className="text-[10px] text-text-muted uppercase">Active Biz</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{summary.businessCount}</p>
          <p className="text-[10px] text-text-muted uppercase">Total Enrolled</p>
        </div>
      </div>
    </div>
  )
}
