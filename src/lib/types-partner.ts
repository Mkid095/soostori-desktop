/**
 * types-partner.ts — Partner platform types for Desktop POS.
 *
 * Phase 18: Canonical partner contracts mirrored from SDK for use in
 * Desktop renderer. Business logic lives in SDK; these are read-only
 * data contracts consumed by UI components.
 *
 * Commercial formula (canonical — do not recalculate in UI):
 *   Company = 500 + 25% × max(0, amount − 600)
 *   Salesperson = 100 + 75% × max(0, amount − 600)
 *   Influencer = 50 flat (paid by company)
 *   Minimum package: 600 KES
 */

/** Salesperson enrolled-business commission summary from cloud. */
export interface PartnerPackage {
  id: string
  businessId: string
  businessName: string
  packageName: string
  amount: number
  salespersonId: string
  isActive: boolean
  createdAt: string
}

/** Partner-related SyncEvent entity kinds (mirrors SDK contracts). */
export type PartnerEntityKind =
  | 'partner.application'
  | 'partner.approved'
  | 'partner.rejected'
  | 'partner.enrolled'
  | 'conversion.qualified'
  | 'commission.created'

/** A conversion.qualified event emitted when a business subscription qualifies. */
export interface ConversionQualifiedPayload {
  businessId: string
  businessName: string
  salespersonId: string
  influencerId?: string
  packageId: string
  packageAmount: number
  qualifiedAt: string
}

/** Commission earning created by conversion — mirrors SDK CommissionEarning. */
export interface CommissionEarningPayload {
  id: string
  salespersonId: string
  influencerId?: string
  businessId: string
  subscriptionId: string
  amount: number
  role: 'salesperson' | 'influencer'
  idempotencyKey: string
  createdAt: string
}

/** Partner state read by Desktop dashboard widget. */
export interface SalespersonDashboard {
  salespersonId: string
  enrolledCount: number
  activeCount: number
  totalEarnings: number
  recentEarnings: number
  lastSyncedAt: string | null
}

/** Cloud session fragment that identifies the logged-in partner. */
export interface PartnerSession {
  salespersonProfileId: string
  isSalesperson: boolean
  role: 'salesperson' | 'owner' | 'attendant' | null
}
