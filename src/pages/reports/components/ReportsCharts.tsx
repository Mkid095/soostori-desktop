import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, PieChart as PieIcon } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import type { Sale } from '../../../lib/types'
import type { ReportsStats } from '../hooks/useReportsState'
import TopProductsChart from './TopProductsChart'

interface TopProductRow {
  product_name: string
  totalQty: number
  totalRevenue: number
}

interface ReportsChartsProps {
  stats: ReportsStats
  filteredSales: Sale[]
  topProducts?: TopProductRow[]
}

const METHOD_COLORS: Record<string, string> = {
  cash: '#10b981',
  mpesa: '#22c55e',
  mobile_money: '#22c55e',
  debt: '#f59e0b',
}

export const ReportsCharts: React.FC<ReportsChartsProps> = ({ stats, filteredSales, topProducts = [] }) => {
  const { t } = useTranslation()
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
    if (stats.cashTotal > 0) result.push({ method: t('rep.cash'), total: stats.cashTotal, color: METHOD_COLORS.cash })
    if (stats.mpesaTotal > 0) result.push({ method: t('pos.mpesa'), total: stats.mpesaTotal, color: METHOD_COLORS.mpesa })
    if (stats.debtTotal > 0) result.push({ method: t('rep.debt'), total: stats.debtTotal, color: METHOD_COLORS.debt })
    return result
  }, [stats, t])

  const currencyTick = (value: number) => `KES ${(value / 1000).toFixed(0)}k`

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="lg:col-span-2">
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <TrendingUp size={12} className="text-brand-orange" />
          {t('rep.revenueOverTime')}
        </h3>
        {lineData.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">{t('rep.noData')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), t('rep.revenue')]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <PieIcon size={12} className="text-brand-orange" />
          {t('rep.paymentMethods')}
        </h3>
        {pieData.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">{t('rep.noData')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} dataKey="total" paddingAngle={3}>
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
      {topProducts.length > 0 && (
        <div className="lg:col-span-3">
          <TopProductsChart data={topProducts} />
        </div>
      )}
    </div>
  )
}

export default ReportsCharts
