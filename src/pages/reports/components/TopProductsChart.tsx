import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

interface TopProductsChartProps {
  data: { product_name: string; totalQty: number; totalRevenue: number }[]
}

const BRAND_ORANGE = '#f97316'

const TopProductsChart: React.FC<TopProductsChartProps> = ({ data }) => {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    return data.slice(0, 10).map((row) => ({
      name: row.product_name.length > 18 ? row.product_name.slice(0, 17) + '…' : row.product_name,
      fullName: row.product_name,
      quantity: row.totalQty,
      revenue: row.totalRevenue,
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <BarChart3 size={12} className="text-brand-orange" />
          {t('rep.topProducts')}
        </h3>
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">
          {t('rep.noData')}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <BarChart3 size={12} className="text-brand-orange" />
        {t('rep.topProducts')}
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === 'quantity' ? `${value} units` : formatCurrency(value),
              name === 'quantity' ? t('rep.quantity') : t('rep.revenue'),
            ]}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? ''}
          />
          <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={BRAND_ORANGE} opacity={1 - index * 0.07} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TopProductsChart
