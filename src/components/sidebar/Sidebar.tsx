import React from 'react'
import { Store } from 'lucide-react'
import SidebarNav, { Page } from './SidebarNav'
import SidebarBottom from './SidebarBottom'

// ============================================================
// PROPS
// ============================================================
interface SoostoriSidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

// ============================================================
// SIDEBAR — logo merged into nav, no dead zone
// ============================================================
const SoostoriSidebar: React.FC<SoostoriSidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`
        fixed top-9 left-0 bottom-0 z-[200] flex flex-col
        bg-bg-secondary border-r border-border-color dark:border-slate-700
        shadow-[4px_0_24px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.4)]
        transition-[width,background-color,border-color] duration-300 ease-out
        ${isCollapsed ? 'w-[56px]' : 'w-[180px]'}
      `}
    >
      {/* Logo — sits inside nav, not above it. Nav starts right after. */}
      <div className={`
        flex items-center gap-2 px-2 pb-1 shrink-0
        ${isCollapsed ? 'justify-center' : ''}
      `}>
        <div className="
          w-6 h-6 rounded-md
          bg-gradient-to-br from-brand-orange to-orange-400
          flex items-center justify-center text-white shrink-0
        ">
          <Store size={13} strokeWidth={2.5} />
        </div>
        <div className={`
          overflow-hidden transition-[width,opacity] duration-300 ease-out
          ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
        `}>
          <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 tracking-tight whitespace-nowrap transition-colors duration-200">
            SOOSTORI
          </span>
        </div>
      </div>

      {/* Navigation — starts immediately after logo (no gap) */}
      <SidebarNav
        currentPage={currentPage}
        isCollapsed={isCollapsed}
        onNavigate={onNavigate}
      />

      {/* Bottom — collapse + support */}
      <SidebarBottom
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </aside>
  )
}

export default SoostoriSidebar
export type { Page }
