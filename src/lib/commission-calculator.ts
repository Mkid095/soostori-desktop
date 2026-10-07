/**
 * commission-calculator.ts — Desktop commission calculator.
 *
 * SDK CONTRACT: Commission math lives in @soostori/partners.
 * This file re-exports the canonical function so existing desktop imports
 * continue to work without path changes.
 */

import { calculateCommission, type CommissionBreakdown } from '@soostori/contracts'

export { calculateCommission, type CommissionBreakdown }

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
