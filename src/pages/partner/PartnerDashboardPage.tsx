/**
 * PartnerDashboardPage.tsx — Phase 19: Salesperson role partner dashboard.
 *
 * Accessible when logged in as SALESPERSON.
 * Shows enrolled businesses, commission summary, and worked examples.
 */

import React, { useMemo } from 'react'
import { RefreshCw, AlertCircle, Building2, ShieldOff, TrendingUp } from 'lucide-react'
import { useCommissions } from '../../hooks/useCommissions'
import { useAuth } from '../../lib/auth-context'
import { CommissionSummaryCard } from './CommissionSummaryCard'
import { EnrolledBusinessCard } from '../commissions/EnrolledBusinessCard'
import { CommissionExamplesTable } from '../commissions/CommissionExamplesTable'

function getSalespersonProfileId(): string | null {
  try {
    const raw = localStorage.getItem('soostori:cloudSession')
    if (raw) return JSON.parse(raw)?.salespersonProfileId ?? null
  } catch { /* ignore */ }
  return null
}

const PartnerDashboardPage: React.FC = () => {
  const { user } = useAuth()
  const isSalesperson = (user as { role?: string } | null)?.role === 'SALESPERSON'

  const salespersonProfileId = useMemo(getSalespersonProfileId, [])
  const { packages, loading, error, refetch } = useCommissions(
    isSalesperson ? salespersonProfileId : null
  )

  if (!isSalesperson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <ShieldOff size={32} className="text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-500">Salesperson access only</p>
        <p className="text-xs text-slate-400 mt-1">This page is available for salesperson accounts.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-orange" />
            <span className="text-sm font-bold text-text-primary">Partner Dashboard</span>
          </div>
          <button
            onClick={() => salespersonProfileId && refetch(salespersonProfileId)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Commission summary */}
        <CommissionSummaryCard packages={packages} />

        {/* Formula reference */}
        <div className="bg-bg-secondary rounded-lg p-3 border border-border-color text-[11px] text-text-secondary font-mono leading-relaxed">
          <div>Company_share = 500 + 25% × max(0, amount − 600)</div>
          <div>Salesperson_share = 100 + 75% × max(0, amount − 600)</div>
          <div>Influencer_share = 50 flat (paid by company)</div>
        </div>

        {/* Worked examples */}
        <CommissionExamplesTable />

        {/* Enrolled businesses */}
        <section>
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">Enrolled Businesses</h2>
          {loading && packages.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-text-muted">
              <RefreshCw size={16} className="animate-spin mr-2" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 size={24} className="text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No enrolled businesses yet</p>
              <p className="text-xs text-slate-400 mt-1">Enroll clients on the Web dashboard to see them here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {packages.map(pkg => (
                <EnrolledBusinessCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default PartnerDashboardPage
