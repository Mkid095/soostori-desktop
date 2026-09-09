/**
 * Cloud identity types — shared across web, mobile, and desktop.
 */

export interface CloudUser {
  id: string
  email: string
  imageURL?: string
  type: 'owner' | 'manager' | 'attendant'
}

export interface CloudEmployee {
  id: string
  shopId: string
  name: string
  email?: string
  phone?: string
  role: 'owner' | 'manager' | 'attendant'
  status: string
  createdBy?: string
  invitedBy?: string
}

export interface CloudDevice {
  id: string
  shopId: string
  deviceId: string
  deviceName?: string
  deviceType: 'mobile' | 'desktop'
  isLanHost: boolean
  isPrimary: boolean
  status: string
  lastSeenAt?: string
  authorizedAt?: string
  lastSyncAt?: string
  tokenRef?: string
  hasPin?: boolean
  pinSetupAt?: string
}

export interface CloudInvitation {
  id: string
  shopId: string
  employeeId: string
  code: string
  expiresAt: string
  status: string
  email?: string
  phone?: string
  createdBy?: string
  employeeRole?: string
  usedAt?: string
}

export interface CloudDeviceAuthorization {
  id: string
  deviceId: string
  authorizedBy: string
  tokenHash: string
  issuedAt: string
  expiresAt?: string
}

export interface SessionData {
  userId: string
  deviceId: string
  shopId: string
  employeeId: string
  email: string
}
