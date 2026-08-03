import React from 'react'
import { ChevronLeft, Phone } from 'lucide-react'

// ============================================================
// COLLAPSE TOGGLE BUTTON
// ============================================================
interface CollapseButtonProps {
  isCollapsed: boolean
  onToggle: () => void
}

const CollapseButton: React.FC<CollapseButtonProps> = ({ isCollapsed, onToggle }) => (
  <button
    onClick={onToggle}
    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    className="
      w-full flex items-center gap-2 px-2 py-1.5 rounded-lg
      text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200
      hover:bg-slate-100 dark:hover:bg-slate-800
      transition-all duration-200 text-[11px]
    "
  >
    <span className={`
      p-1 rounded-md bg-slate-100 dark:bg-slate-800
      group-hover:bg-slate-200 dark:group-hover:bg-slate-700
      transition-colors duration-200
      flex items-center justify-center
      ${isCollapsed ? 'mx-auto' : ''}
    `}>
      <ChevronLeft
        size={13}
        className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
      />
    </span>
    {!isCollapsed && (
      <span className="text-[11px] font-semibold">Collapse</span>
    )}
  </button>
)

// ============================================================
// SUPPORT BADGE
// ============================================================
interface SupportBadgeProps {
  isCollapsed: boolean
}

const SupportBadge: React.FC<SupportBadgeProps> = ({ isCollapsed }) => (
  <div className={`
    mx-1 px-2 py-1.5 rounded-lg
    bg-gradient-to-r from-orange-50 to-amber-50
    dark:from-orange-950/30 dark:to-amber-950/30
    border border-orange-100/60 dark:border-orange-900/50
    transition-all duration-300
    ${isCollapsed ? 'flex justify-center' : ''}
  `}>
    {isCollapsed ? (
      <a
        href="tel:+254746269657"
        className="
          p-1 rounded-md bg-white/70 dark:bg-slate-800/70 text-brand-orange
          hover:bg-white dark:hover:bg-slate-800 transition-colors
        "
        title="Call support"
      >
        <Phone size={13} strokeWidth={2} />
      </a>
    ) : (
      <div className="flex items-center gap-2">
        <div className="
          w-7 h-7 rounded-md bg-brand-orange/10 dark:bg-brand-orange/20
          flex items-center justify-center shrink-0
        ">
          <Phone size={12} className="text-brand-orange" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-brand-orange uppercase tracking-wide leading-tight">
            Support
          </p>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate transition-colors duration-200">+254 746 269 657</p>
        </div>
      </div>
    )}
  </div>
)

// ============================================================
// BOTTOM SECTION WRAPPER
// ============================================================
interface SidebarBottomProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const SidebarBottom: React.FC<SidebarBottomProps> = ({ isCollapsed, onToggleCollapse }) => (
  <div className="border-t border-slate-100/60 dark:border-slate-700/60 py-2 px-2 space-y-1.5 transition-colors duration-200">
    <CollapseButton isCollapsed={isCollapsed} onToggle={onToggleCollapse} />
    <SupportBadge isCollapsed={isCollapsed} />
  </div>
)

export default SidebarBottom
