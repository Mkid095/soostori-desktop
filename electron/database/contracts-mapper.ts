/**
 * contracts-mapper.ts — Local SQLite ↔ @soostori/contracts entity mapper (part 1).
 *
 * Cycle 04 Sub-cycle C. Translates Desktop's snake_case local rows into the
 * canonical camelCase SDK entity types. Local columns are NOT renamed — the
 * mapper translates through. See `contracts-mapper-2.ts` for commerce + audit.
 *
 * ANPAS: ≤150 lines, no helpers.ts / common.ts / utils.ts.
 */

import type {
  Business, Employee, Device, Invitation, Product, Category,
} from '@soostori/contracts'
import type {
  BusinessId, EmployeeId, DeviceId, InvitationId, ProductId, CategoryId, UserId,
} from '@soostori/core'

export const V1 = 1
export const asBI = (s: string): BusinessId => s as BusinessId
export const asEI = (s: string): EmployeeId => s as EmployeeId
export const asDI = (s: string): DeviceId => s as DeviceId
export const asII = (s: string): InvitationId => s as InvitationId
export const asPI = (s: string): ProductId => s as ProductId
export const asCI = (s: string): CategoryId => s as CategoryId
export const asUI = (s: string): UserId => s as UserId
export const bool01 = (n: unknown): boolean => n === 1 || n === true
export const safeJson = <T>(s: unknown, d: T): T => {
  try { return s ? JSON.parse(String(s)) as T : d } catch { return d }
}

// ── Business ← shops ─────────────────────────────────────────────────────────
export interface ShopsRow {
  id: string; name: string; currency: string
  owner_id?: string | null; created_at?: string
}
export const fromLocalBusiness = (r: ShopsRow): Business => ({
  id: asBI(r.id), name: r.name, slug: '', taxRate: 0, plan: '',
  subscriptionExpiry: null, status: 'active', currency: r.currency || 'KES',
  ownerPersonId: asBI(r.owner_id ?? '') as unknown as Business['ownerPersonId'],
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.created_at ?? new Date().toISOString(), version: V1,
})
export const toLocalBusiness = (e: Business): Partial<ShopsRow> => ({
  id: e.id, name: e.name, currency: e.currency,
})

// ── Employee ← employees ─────────────────────────────────────────────────────
export interface EmployeesRow {
  id: string; shop_id: string; name: string; role: string
  is_active: number; cloud_id?: string | null; updated_at?: string
}
export const fromLocalEmployee = (r: EmployeesRow): Employee => ({
  id: asEI(r.id), businessId: asBI(r.shop_id), name: r.name,
  email: null, phone: null, role: (r.role as Employee['role']) || 'cashier',
  permissions: null, cloudId: r.cloud_id ?? '', status: bool01(r.is_active) ? 'active' : 'inactive',
  createdBy: null, invitedBy: null,
  createdAt: r.updated_at ?? new Date().toISOString(),
  updatedAt: r.updated_at ?? new Date().toISOString(), version: V1,
})
export const toLocalEmployee = (e: Employee): Partial<EmployeesRow> => ({
  id: e.id, shop_id: e.businessId, name: e.name,
  role: e.role, is_active: e.status === 'active' ? 1 : 0, cloud_id: e.cloudId,
})

// ── Device ← devices ─────────────────────────────────────────────────────────
export interface DevicesRow {
  id: string; shop_id: string; device_name: string; device_type: string
  is_host: number; cloud_has_pin: number
  cloud_pin_setup_at?: string | null; last_seen?: string | null
}
export const fromLocalDevice = (r: DevicesRow): Device => ({
  id: asDI(r.id), businessId: asBI(r.shop_id), deviceName: r.device_name,
  deviceType: (r.device_type as Device['deviceType']) || 'desktop',
  status: 'authorized', isLanHost: bool01(r.is_host), hasPin: bool01(r.cloud_has_pin),
  pinSetupAt: r.cloud_pin_setup_at ?? null, authorizedAt: null,
  lastSeenAt: r.last_seen ?? null,
  createdAt: r.last_seen ?? new Date().toISOString(),
  updatedAt: r.last_seen ?? new Date().toISOString(), version: V1,
})
export const toLocalDevice = (d: Device): Partial<DevicesRow> => ({
  id: d.id, shop_id: d.businessId, device_name: d.deviceName,
  device_type: d.deviceType, is_host: d.isLanHost ? 1 : 0,
})

// ── Invitation ← invitations ─────────────────────────────────────────────────
export interface InvitationsRow {
  id: string; shop_id: string; role: string; code: string
  created_by?: string; expires_at: string
  used_at?: string | null; cloud_used_at?: string | null
}
export const fromLocalInvitation = (r: InvitationsRow): Invitation => ({
  id: asII(r.id), businessId: asBI(r.shop_id), email: null, phone: null,
  employeeRole: (r.role as Invitation['employeeRole']) || 'cashier', code: r.code,
  status: r.used_at ?? r.cloud_used_at ? 'accepted' : 'pending',
  expiresAt: r.expires_at, createdBy: r.created_by ? asUI(r.created_by) : null,
  usedAt: r.used_at ?? r.cloud_used_at ?? null,
  createdAt: r.expires_at, version: V1,
})

// ── Product ← products ───────────────────────────────────────────────────────
export interface ProductsRow {
  id: string; shop_id: string; name: string
  sku?: string | null; barcode?: string | null; category_id?: string | null
  description?: string | null; cost_price: number; selling_price: number
  group_prices?: string | null; stock_quantity: number; current_stock: number
  low_stock_threshold: number; track_inventory: number; allow_single_unit_sale: number
  distributor_name?: string | null; distributor_phone?: string | null
  image_url?: string | null; is_active: number; units_per_package?: number | null
  created_at?: string; updated_at?: string
}
export const fromLocalProduct = (r: ProductsRow): Product => ({
  id: asPI(r.id), businessId: asBI(r.shop_id), name: r.name,
  barcode: r.barcode ?? null, sku: r.sku ?? null,
  categoryId: r.category_id ? asCI(r.category_id) : null,
  description: r.description ?? null, costPrice: r.cost_price, sellingPrice: r.selling_price,
  groupPrices: safeJson<unknown>(r.group_prices, null), isGroup: false,
  unitsPerPackage: r.units_per_package ?? 1, stockQuantity: r.stock_quantity,
  currentStock: r.current_stock, lowStockThreshold: r.low_stock_threshold,
  trackInventory: bool01(r.track_inventory), allowSingleUnitSale: bool01(r.allow_single_unit_sale),
  distributorName: r.distributor_name ?? null, distributorPhone: r.distributor_phone ?? null,
  image: r.image_url ?? null, isActive: bool01(r.is_active),
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.updated_at ?? new Date().toISOString(), version: V1,
})
export const toLocalProduct = (p: Product): Partial<ProductsRow> => ({
  id: p.id, shop_id: p.businessId, name: p.name, sku: p.sku, barcode: p.barcode,
  category_id: p.categoryId, description: p.description, cost_price: p.costPrice,
  selling_price: p.sellingPrice,
  group_prices: p.groupPrices ? JSON.stringify(p.groupPrices) : null,
  stock_quantity: p.stockQuantity, current_stock: p.currentStock,
  low_stock_threshold: p.lowStockThreshold, track_inventory: p.trackInventory ? 1 : 0,
  allow_single_unit_sale: p.allowSingleUnitSale ? 1 : 0, is_active: p.isActive ? 1 : 0,
})

// ── Category ← categories ────────────────────────────────────────────────────
export interface CategoriesRow {
  id: string; shop_id: string; name: string; color: string
  description?: string | null; is_active: number
  created_at?: string; updated_at?: string
}
export const fromLocalCategory = (r: CategoriesRow): Category => ({
  id: asCI(r.id), businessId: asBI(r.shop_id), name: r.name,
  color: r.color || '#6366f1', description: r.description ?? null,
  isActive: bool01(r.is_active),
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.updated_at ?? new Date().toISOString(), version: V1,
})