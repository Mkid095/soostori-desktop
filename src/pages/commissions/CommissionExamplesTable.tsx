/**
 * CommissionExamplesTable.tsx — Worked example table for the commission formula.
 */

import React from 'react'
import { calculateCommission, COMMISSION_EXAMPLES, formatKES } from '../../lib/commission-calculator'

function WorkedExampleRow({ amount }: { amount: number }) {
  const b = calculateCommission(amount)
  return (
    <tr className="border-b border-border-color last:border-0">
      <td className="px-4 py-2 text-sm font-medium text-text-primary">{formatKES(amount)}</td>
      <td className="px-4 py-2 text-sm text-text-primary text-right">{formatKES(b.companyShare)}</td>
      <td className="px-4 py-2 text-sm text-green-600 text-right font-medium">{formatKES(b.salespersonShare)}</td>
      <td className="px-4 py-2 text-sm text-blue-600 text-right">{formatKES(b.influencerShare)}</td>
    </tr>
  )
}

export function CommissionExamplesTable() {
  return (
    <section>
      <h2 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">Worked Examples</h2>
      <div className="bg-bg-secondary rounded-lg border border-border-color overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-primary border-b border-border-color">
              <th className="px-4 py-2 text-left text-[10px] font-bold text-text-muted uppercase">Package</th>
              <th className="px-4 py-2 text-right text-[10px] font-bold text-text-muted uppercase">Company</th>
              <th className="px-4 py-2 text-right text-[10px] font-bold text-green-600 uppercase">You earn</th>
              <th className="px-4 py-2 text-right text-[10px] font-bold text-blue-600 uppercase">Influencer</th>
            </tr>
          </thead>
          <tbody>
            {COMMISSION_EXAMPLES.map(ex => (
              <WorkedExampleRow key={ex.packageAmount} amount={ex.packageAmount} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
