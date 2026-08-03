import React from 'react'

export type HeaderPage = 'pos' | 'inventory' | 'reports' | 'debts' | 'settings'

interface SoostoriHeaderProps {
  title: string
  subtitle?: string
  /** Legacy prop retained for callers while page icons are intentionally not rendered. */
  icon?: React.ReactNode
  controls?: React.ReactNode
}

const SoostoriHeader: React.FC<SoostoriHeaderProps> = ({ title, subtitle, controls }) => (
  <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-color bg-bg-secondary px-4 transition-colors duration-200">
    <div className="min-w-0">
      <h1 className="truncate text-[14px] font-black leading-tight text-text-primary">{title}</h1>
      {subtitle && <p className="truncate text-[10px] leading-tight text-text-muted">{subtitle}</p>}
    </div>
    {controls && <div className="ml-4 flex min-w-0 items-center gap-2">{controls}</div>}
  </header>
)

export default SoostoriHeader
