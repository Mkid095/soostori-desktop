/**
 * commission-calculator.ts — Desktop commission calculator.
 *
 * SDK CONTRACT: Commission math lives in @soostori/contracts.
 * This file re-exports the canonical function so existing desktop imports
 * continue to work without path changes.
 */

import { calculateCommission, type CommissionSplit } from '@soostori/contracts'
import type { Money } from '@soostori/core'

export { calculateCommission }
export type { CommissionSplit, Money }

/** Worked examples as shown in the brief — plain objects with packageAmount for display. */
export interface CommissionExample {
  packageAmount: Money
  companyShare: Money
  salespersonShare: Money
  influencerShare: Money
  total: Money
}

export const COMMISSION_EXAMPLES: CommissionExample[] = [
  { packageAmount: 600 as Money, ...calculateCommission(600 as Money) },
  { packageAmount: 1000 as Money, ...calculateCommission(1000 as Money) },
  { packageAmount: 2000 as Money, ...calculateCommission(2000 as Money) },
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
