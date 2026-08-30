import { createContext, useContext, type ReactNode } from 'react'
import type { ShopUser, Device } from '../../electron/preload/types'

interface AuthValue {
  user: ShopUser | null
  device: Device | null
  sessionId: string | null
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthValue | null>(null)

const PERMISSIONS = {
  owner: ['sales', 'receipts', 'customers', 'inventory', 'reports', 'expenses', 'team', 'devices', 'settings'],
  manager: ['sales', 'receipts', 'customers', 'inventory', 'reports', 'expenses'],
  cashier: ['sales', 'receipts', 'customers'],
} as const

export function AuthProvider({ children, value }: { children: ReactNode; value: AuthValue }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
