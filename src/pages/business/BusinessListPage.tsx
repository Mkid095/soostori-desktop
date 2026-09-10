/**
 * BusinessListPage.tsx — Phase 07: Business List + Business Switcher.
 *
 * Lists all businesses the current user has access to.
 * Shows name, type, member count.
 * Tap a business to switch active context (activeBusinessId).
 */

import React, { useEffect, useState } from 'react'
import { Building2, Users, CheckCircle, ChevronRight, RefreshCw } from 'lucide-react'

interface Business {
  id: string
  name: string
  currency: string
  created_at: string
  memberCount: number
}

interface Props {
  onClose?: () => void
}

const BusinessListPage: React.FC<Props> = ({ onClose }) => {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [list, activeId] = await Promise.all([
        window.electronAPI.db.listBusinessesForUser(),
        window.electronAPI.db.getActiveBusinessId(),
      ])
      setBusinesses(list)
      setActiveBusinessId(activeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSwitch = async (businessId: string) => {
    if (businessId === activeBusinessId) return
    setSwitching(businessId)
    try {
      await window.electronAPI.db.setActiveBusiness(businessId)
      setActiveBusinessId(businessId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch business')
    } finally {
      setSwitching(null)
    }
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return iso
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-color shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
            <Building2 size={18} className="text-brand-orange" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">My Businesses</h2>
            <p className="text-[10px] text-text-muted">Switch active business context</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={load}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ChevronRight size={18} className="text-slate-400 rotate-90" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && businesses.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && businesses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-text-muted">No businesses yet.</p>
            <p className="text-xs text-slate-400 mt-1">Use "Add Business" to create your first one.</p>
          </div>
        )}

        {businesses.map(biz => (
          <button
            key={biz.id}
            onClick={() => handleSwitch(biz.id)}
            disabled={switching !== null}
            className={`
              w-full bg-bg-secondary dark:bg-slate-800/60 rounded-2xl border p-4 text-left
              transition-all flex items-center gap-3
              ${biz.id === activeBusinessId
                ? 'border-brand-orange/40 shadow-sm ring-1 ring-brand-orange/20'
                : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${biz.id === activeBusinessId ? 'bg-orange-50 dark:bg-orange-950/40' : 'bg-slate-50 dark:bg-slate-700/50'}
            `}>
              <Building2 size={18} className={biz.id === activeBusinessId ? 'text-brand-orange' : 'text-slate-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-text-primary truncate">{biz.name}</p>
                {biz.id === activeBusinessId && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-orange shrink-0">
                    <CheckCircle size={10} /> Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Users size={11} />{biz.memberCount} member{biz.memberCount !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-slate-400">{biz.currency}</span>
                <span className="text-[11px] text-slate-400">{formatDate(biz.created_at)}</span>
              </div>
            </div>
            {switching === biz.id && (
              <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            {biz.id !== activeBusinessId && switching !== biz.id && (
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BusinessListPage
