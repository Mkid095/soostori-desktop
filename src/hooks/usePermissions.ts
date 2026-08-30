import { useCallback } from 'react'
import type { ShopUser } from '../../electron/preload/types'

const PERMISSIONS = {
  owner: ['sales', 'receipts', 'customers', 'inventory', 'reports', 'expenses', 'team', 'devices', 'settings'],
  manager: ['sales', 'receipts', 'customers', 'inventory', 'reports', 'expenses'],
  cashier: ['sales', 'receipts', 'customers'],
} as const

export function usePermissions(authUser: ShopUser | null) {
  const can = useCallback((permission: string): boolean => {
    if (!authUser) return false
    const role = authUser.role as keyof typeof PERMISSIONS
    return (PERMISSIONS[role] as readonly string[]).includes(permission)
  }, [authUser])

  return { can }
}
