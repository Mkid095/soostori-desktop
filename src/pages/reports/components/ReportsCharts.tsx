import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { Sale } from '../../../lib/types'
import type { ReportsStats } from '../hooks/useReportsState'

interface ReportsChartsProps {
  stats: ReportsStats
  filteredSales: Sale[]
}

const METHOD_COLORS: Record<string, string> = {
  cash: '#10b981',
  mpesa: '#22c55e',
  mobile_money: '#22c55e',
  debt: '#f59e0b',
}

export const ReportsCharts: React.FC<ReportsChartsProps> = ({ stats, filteredSales }) => {
  const lineData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const sale of filteredSales) {
      const date = new Date(sale.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
      map[date] = (map[date] || 0) + sale.totalAmount
    }
    return Object.entries(map)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, amount]) => ({ date, amount }))
  }, [filteredSales])

  const pieData = useMemo(() => {
    const result: { method: string; total: number; color: string }[] = []
    if (stats.cashTotal > 0) result.push({ method: 'Cash', total: stats.cashTotal, color: METHOD_COLORS.cash })
    if (stats.mpesaTotal > 0) result.push({ method: 'M-Pesa', total: stats.mpesaTotal, color: METHOD_COLORS.mpesa })
    if (stats.debtTotal > 0) result.push({ method: 'Debt', total: stats.debtTotal, color: METHOD_COLORS.debt })
    return result
  }, [stats])

  const currencyTick = (value: number) => `KES ${(value / 1000).toFixed(0)}k`

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
      <div className="lg:col-span-3">
        <h3 className="mb-2 text-xs font-bold uppercase text-text-secondary">Revenue Over Time</h3>
        {lineData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs text-text-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="lg:col-span-2">
        <h3 className="mb-2 text-xs font-bold uppercase text-text-secondary">Payment Methods</h3>
        {pieData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs text-text-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="total" paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.method} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Total']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default ReportsCharts
