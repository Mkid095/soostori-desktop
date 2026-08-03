import React from 'react'
import { AlertCircle, Banknote, Smartphone, CreditCard } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import type { ReportsStats } from '../hooks/useReportsState'

interface StatCardProps {
  label: string
  amount: number
  accent: 'orange' | 'emerald' | 'green' | 'amber' | 'violet'
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const ACCENTS: Record<StatCardProps['accent'], { bg: string; text: string; amount: string }> = {
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-400',
    amount: 'text-orange-700 dark:text-orange-300',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    amount: 'text-emerald-700 dark:text-emerald-300',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/40',
    text: 'text-green-600 dark:text-green-400',
    amount: 'text-green-700 dark:text-green-300',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    amount: 'text-amber-700 dark:text-amber-300',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    amount: 'text-violet-700 dark:text-violet-300',
  },
}

const StatCard: React.FC<StatCardProps> = ({ label, amount, accent, icon: Icon }) => {
  const tone = ACCENTS[accent]
  return (
    <div className={`flex items-center gap-3 rounded-2xl ${tone.bg} px-3 py-2.5`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-900/40 ${tone.text}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[9px] font-bold uppercase tracking-wider ${tone.text}`}>{label}</p>
        <p className={`truncate text-sm font-black tabular-nums ${tone.amount}`}>{formatCurrency(amount)}</p>
      </div>
    </div>
  )
}

interface ReportsStatsCardsProps {
  stats: ReportsStats
  debtCollected: number
}

export const ReportsStatsCards: React.FC<ReportsStatsCardsProps> = ({ stats, debtCollected }) => {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label={t('label.total')} amount={stats.total} accent="orange" icon={CreditCard} />
      <StatCard label={t('rep.cash')} amount={stats.cashTotal} accent="emerald" icon={Banknote} />
      <StatCard label={t('pos.mpesa')} amount={stats.mpesaTotal} accent="green" icon={Smartphone} />
      <StatCard label={t('rep.debtSales')} amount={stats.debtTotal} accent="amber" icon={AlertCircle} />
      <StatCard label={t('rep.debtCollected')} amount={debtCollected} accent="violet" icon={AlertCircle} />
    </div>
  )
}

export default ReportsStatsCards
