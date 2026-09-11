/**
 * usePartnerCommission.ts — Commission data for the logged-in salesperson.
 *
 * Phase 18: Fetches enrolled-business commission data from cloud via IPC.
 * Used by the commission.view_own dashboard widget.
 *
 * All commission calculation happens server-side; this hook is read-only.
 */

import { useState, useEffect, useCallback } from 'react'
import type { ElectronAPI } from '../../electron/preload/types'
import type { PartnerPackage } from '../lib/types-partner'

interface UsePartnerCommissionResult {
  packages: PartnerPackage[]
  loading: boolean
  error: string | null
  enrolledCount: number
  activeCount: number
  totalEarnings: number
  recentEarnings: number
  refetch: () => Promise<void>
}

/** Derive salesperson ID from cloud session stored in localStorage. */
function getSalespersonProfileId(): string | null {
  try {
    const raw = localStorage.getItem('soostori:cloudSession')
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.salespersonProfileId ?? null
  } catch {
    return null
  }
}

/** Extract salesperson ID if the current cloud user is a salesperson. */
function extractSalespersonSession(): { salespersonProfileId: string | null; isSalesperson: boolean } {
  try {
    const raw = localStorage.getItem('soostori:cloudSession')
    if (!raw) return { salespersonProfileId: null, isSalesperson: false }
    const session = JSON.parse(raw)
    const spId = session?.salespersonProfileId ?? null
    return { salespersonProfileId: spId, isSalesperson: !!spId }
  } catch {
    return { salespersonProfileId: null, isSalesperson: false }
  }
}

/**
 * Fetch and compute commission summary for the logged-in salesperson.
 * Returns empty data if the user is not a salesperson.
 */
export function usePartnerCommission(): UsePartnerCommissionResult {
  const [packages, setPackages] = useState<PartnerPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { salespersonProfileId, isSalesperson } = extractSalespersonSession()

  const fetch_ = useCallback(async () => {
    if (!salespersonProfileId) return
    setLoading(true)
    setError(null)
    try {
      const cloud = (window.electronAPI as ElectronAPI)?.cloud
      if (!cloud) throw new Error('Cloud API not available')
      const result = await cloud.pullCommissions(salespersonProfileId)
      if (result.success) {
        setPackages(result.packages as PartnerPackage[] ?? [])
      } else {
        setError(result.error ?? 'Unknown error')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [salespersonProfileId])

  useEffect(() => {
    if (salespersonProfileId) {
      fetch_()
    }
  }, [salespersonProfileId, fetch_])

  // Derived summary stats — calculation mirrors SDK canonical formula
  const enrolledCount = packages.length
  const activeCount = packages.filter(p => p.isActive).length
  const totalEarnings = packages.reduce((sum, pkg) => {
    const excess = Math.max(0, pkg.amount - 600)
    return sum + 100 + 0.75 * excess
  }, 0)

  // Earnings from packages created in the last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentEarnings = packages
    .filter(p => new Date(p.createdAt).getTime() > thirtyDaysAgo)
    .reduce((sum, pkg) => {
      const excess = Math.max(0, pkg.amount - 600)
      return sum + 100 + 0.75 * excess
    }, 0)

  return {
    packages,
    loading,
    error,
    enrolledCount,
    activeCount,
    totalEarnings,
    recentEarnings,
    refetch: fetch_,
  }
}

/** Whether the current cloud user has the salesperson partner role. */
export function useIsSalesperson(): boolean {
  return extractSalespersonSession().isSalesperson
}

/** The salespersonProfileId of the current cloud user (or null). */
export function useSalespersonId(): string | null {
  return getSalespersonProfileId()
}
