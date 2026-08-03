import React from 'react'
import { Briefcase, Calendar, Plus, Search } from 'lucide-react'
import { dispatchHeaderAction } from '../../lib/header-controls-bus'

export interface HeldSalesSlot {
  kind: 'pos'
  count: number
}

export interface InventorySlot {
  kind: 'inventory'
  search: string
}

export interface ReportsSlot {
  kind: 'reports'
  dateFilter: string
}

export interface DebtSlot {
  kind: 'debts'
  search: string
}

export type HeaderControlSlot = HeldSalesSlot | InventorySlot | ReportsSlot | DebtSlot | null

interface HeaderControlsProps {
  slot: HeaderControlSlot
}

const dateLabels: Record<string, string> = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }

const HeldSalesControl: React.FC<{ count: number }> = ({ count }) => (
  <button type="button" onClick={() => dispatchHeaderAction({ type: 'pos:showHeld' })} aria-label={`Held sales, ${count} saved`} title="Open held sales" className="flex h-9 items-center gap-2 rounded-full border border-border-color bg-bg-tertiary px-3 text-xs font-semibold text-text-primary transition-all duration-200 hover:border-brand-orange hover:text-brand-orange">
    <Briefcase size={14} />
    <span>Held Sales</span>
    <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-black text-white">{count}</span>
  </button>
)

const emitSearch = (event: string, value: string) => {
  window.dispatchEvent(new CustomEvent(event, { detail: { value } }))
}

const InventoryControls: React.FC<Omit<InventorySlot, 'kind'>> = ({ search }) => (
  <>
    <div className="relative w-56">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={search}
        placeholder="Search products..."
        aria-label="Search products"
        onChange={(e) => emitSearch('soostori:app:inventorySearch', e.target.value)}
        className="h-9 w-full rounded-full border border-border-color bg-bg-tertiary pl-8 pr-3 text-xs font-semibold text-text-primary outline-none transition-all duration-200 focus:border-brand-orange"
      />
    </div>
    <button type="button" onClick={() => dispatchHeaderAction({ type: 'inventory:addProduct', search })} aria-label="Add product" title="Add product" className="flex h-9 items-center gap-1.5 rounded-full bg-brand-orange px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-orange-600">
      <Plus size={14} />
      <span>Add Product</span>
    </button>
  </>
)

const ReportsControls: React.FC<Omit<ReportsSlot, 'kind'>> = ({ dateFilter }) => (
  <div className="flex h-9 items-center gap-2 rounded-full border border-border-color bg-bg-tertiary px-3 text-xs font-semibold text-text-primary">
    <Calendar size={14} className="text-brand-orange" />
    <span>{dateLabels[dateFilter] ?? 'All Time'}</span>
  </div>
)

const DebtControls: React.FC<Omit<DebtSlot, 'kind'>> = ({ search }) => (
  <>
    <div className="relative w-56">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={search}
        placeholder="Search debts..."
        aria-label="Search debts"
        onChange={(e) => emitSearch('soostori:app:debtSearch', e.target.value)}
        className="h-9 w-full rounded-full border border-border-color bg-bg-tertiary pl-8 pr-3 text-xs font-semibold text-text-primary outline-none transition-all duration-200 focus:border-brand-orange"
      />
    </div>
    <button type="button" onClick={() => dispatchHeaderAction({ type: 'debts:addCustomer', search })} aria-label="Add customer" title="Add customer" className="flex h-9 items-center gap-1.5 rounded-full bg-brand-orange px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-orange-600">
      <Plus size={14} />
      <span>Add Customer</span>
    </button>
  </>
)

const HeaderControls: React.FC<HeaderControlsProps> = ({ slot }) => {
  if (!slot) return null
  if (slot.kind === 'pos') return <HeldSalesControl count={slot.count} />
  if (slot.kind === 'inventory') return <InventoryControls {...slot} />
  if (slot.kind === 'reports') return <ReportsControls {...slot} />
  if (slot.kind === 'debts') return <DebtControls {...slot} />
  return null
}

export default HeaderControls
