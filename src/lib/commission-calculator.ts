/**
 * commission-calculator.ts — Commission split formula for Phase 06 Commercial.
 *
 * Formula (per brief):
 *   Company_share     = 500 + 25% × max(0, packageAmount − 600)
 *   Salesperson_share = 100 + 75% × max(0, packageAmount − 600)
 *   Influencer_share  = 50 flat (paid BY COMPANY, not from client payment)
 *
 * Base minimum package: 600 KES/month
 */

const BASE_MINIMUM = 600
const INFLUENCER_FLAT = 50

export interface CommissionBreakdown {
  packageAmount: number
  companyShare: number
  salespersonShare: number
  influencerShare: number
  excess: number
}

/**
 * Calculate commission breakdown for a given package amount.
 * Returns zeros for amounts below the base minimum.
 */
export function calculateCommission(packageAmount: number): CommissionBreakdown {
  const excess = Math.max(0, packageAmount - BASE_MINIMUM)
  const companyShare = 500 + 0.25 * excess
  const salespersonShare = 100 + 0.75 * excess
  return {
    packageAmount,
    companyShare,
    salespersonShare,
    influencerShare: INFLUENCER_FLAT,
    excess,
  }
}

/** Worked examples as shown in the brief. */
export const COMMISSION_EXAMPLES: CommissionBreakdown[] = [
  calculateCommission(600),
  calculateCommission(1000),
  calculateCommission(2000),
]

/**
 * Format a number as KES currency string.
 * Keeps cents if non-zero, otherwise shows whole number.
 */
export function formatKES(amount: number): string {
  const whole = Math.floor(amount)
  const cents = Math.round((amount - whole) * 100)
  if (cents === 0) return `${whole.toLocaleString()} KES`
  return `${whole.toLocaleString()}.${cents.toString().padStart(2, '0')} KES`
}
