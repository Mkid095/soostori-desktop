// Shop / team domain types
export interface Shop {
  id: string
  name: string
  currency: string
  owner_id: string | null
  created_at: string
}

export interface ShopUser {
  id: string
  shop_id: string
  name: string
  pin_hash: string
  pin_salt: string
  role: 'owner' | 'manager' | 'cashier'
  is_active: number
  created_at: string
}

export interface Invitation {
  id: string
  shop_id: string
  employee_name: string
  role: string
  code: string
  device_name: string | null
  created_by: string
  expires_at: string
  used_at: string | null
}

export interface Device {
  id: string
  shop_id: string
  employee_id: string | null
  device_name: string
  device_type: 'desktop' | 'mobile'
  capabilities: string
  is_host: number
  is_online: number
  last_seen: string | null
  created_at: string
}

export interface DevicePairing {
  id: string
  shop_id: string
  device_id: string
  requested_by: string
  approved_by: string | null
  status: 'pending' | 'approved' | 'rejected'
  token: string | null
  created_at: string
}
