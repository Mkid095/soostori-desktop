import { useCallback } from 'react'
import type { ShopUser } from '../../electron/preload/types'

const PERMISSIONS = {
  owner: ['sales', 'receipts', 'customers', 'inventory', 'reports', 'expenses', 'team', 'devices', 'settings'],
  manager: ['sales', 'receipts', 'customers', 'inventory', 'reports', 'expenses'],
  cashier: ['sales', 'receipts', 'customers'],
} as const

const TEAM_CAPABILITY_PERMISSIONS: Record<string, string[]> = {
  owner:      ['team.view', 'team.invite', 'team.update', 'team.remove', 'team.assign_role', 'team.assign_permission'],
  manager:    ['team.view', 'team.invite', 'team.update', 'team.remove', 'team.assign_role'],
  cashier:    [],
  attendant:  [],
}

const DEVICES_CAPABILITY_PERMISSIONS: Record<string, string[]> = {
  owner:      ['devices.view', 'devices.manage', 'devices.transfer_primary'],
  manager:    ['devices.view', 'devices.manage', 'devices.transfer_primary'],
  cashier:    [],
  attendant:  [],
}

export function usePermissions(authUser: ShopUser | null) {
  const can = useCallback((permission: string): boolean => {
    if (!authUser) return false
    const role = authUser.role as keyof typeof PERMISSIONS
    const legacy = (PERMISSIONS[role] as readonly string[]).includes(permission)
    if (legacy) return true
    const teamCaps = TEAM_CAPABILITY_PERMISSIONS[role] ?? []
    if (teamCaps.includes(permission)) return true
    const deviceCaps = DEVICES_CAPABILITY_PERMISSIONS[role] ?? []
    return deviceCaps.includes(permission)
  }, [authUser])

  return { can }
}
