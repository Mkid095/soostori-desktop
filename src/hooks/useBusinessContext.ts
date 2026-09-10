/**
 * useBusinessContext.ts — Phase 07: Active business context hook.
 *
 * Manages the activeBusinessId — the currently selected business scope.
 * Used throughout the app to scope queries and operations.
 */

import { useState, useEffect, useCallback } from 'react'

export function useBusinessContext() {
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.db.getActiveBusinessId().then(id => {
      setActiveBusinessIdState(id)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  const setActiveBusinessId = useCallback(async (businessId: string) => {
    await window.electronAPI.db.setActiveBusiness(businessId)
    setActiveBusinessIdState(businessId)
  }, [])

  return { activeBusinessId, setActiveBusinessId, loading }
}
