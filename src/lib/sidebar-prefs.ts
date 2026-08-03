import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sidebarCollapsed'

export const SIDEBAR_EXPANDED = 180
export const SIDEBAR_COLLAPSED = 56

export interface SidebarPrefs {
  collapsed: boolean
  toggle: () => void
}

export function useSidebarPrefs(): SidebarPrefs {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)) } catch { /* ignore */ }
  }, [collapsed])

  const toggle = useCallback(() => setCollapsed(prev => !prev), [])

  return { collapsed, toggle }
}
