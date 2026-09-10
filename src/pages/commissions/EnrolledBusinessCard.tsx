/**
 * EnrolledBusinessCard.tsx — Individual enrolled business commission card.
 */

import React, { useMemo } from 'react'
import { Building2, Package } from 'lucide-react'
import { calculateCommission, formatKES } from '../../lib/commission-calculator'
import type { SalespersonPackage } from '../../../electron/preload/ipc-signatures-hw'

interface Props {
  pkg: SalespersonPackage
}

export function EnrolledBusinessCard({ pkg }: Props) {
  const commission = useMemo(() => calculateCommission(pkg.amount), [pkg.amount])

  return (
    <div className={`bg-bg-secondary rounded-lg p-4 border ${pkg.isActive ? 'border-border-color' : 'border-orange-200 dark:border-orange-800'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={14} className="text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-text-primary truncate">{pkg.businessName}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${pkg.isActive
          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
        }`}>
          {pkg.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <Package size={12} className="text-slate-400" />
        <span className="text-xs text-text-muted">{pkg.packageName}</span>
        <span className="ml-auto text-xs font-semibold text-text-primary">{formatKES(pkg.amount)}/mo</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg-primary rounded p-1.5">
          <p className="text-[10px] text-text-muted uppercase mb-0.5">You earn</p>
          <p className="text-sm font-bold text-green-600">{formatKES(commission.salespersonShare)}</p>
        </div>
        <div className="bg-bg-primary rounded p-1.5">
          <p className="text-[10px] text-text-muted uppercase mb-0.5">Company</p>
          <p className="text-sm font-medium text-text-primary">{formatKES(commission.companyShare)}</p>
        </div>
        <div className="bg-bg-primary rounded p-1.5">
          <p className="text-[10px] text-text-muted uppercase mb-0.5">Influencer</p>
          <p className="text-sm font-medium text-blue-600">{formatKES(commission.influencerShare)}</p>
        </div>
      </div>
    </div>
  )
}
