import React from 'react'

type IconProps = { size?: number; strokeWidth?: number; className?: string }
type LucideIcon = React.FC<IconProps>

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

interface NavItemButtonProps {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
}

// ============================================================
// NAV ITEM — subtle background tint on active, no left-border bar.
// ============================================================
const NavItemButton: React.FC<NavItemButtonProps> = ({
  item, isActive, isCollapsed, onClick,
}) => {
  const Icon = item.icon

  return (
    <button
      onClick={onClick}
      title={isCollapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={`
        group relative w-full flex items-center gap-3 rounded-xl
        transition-[background-color,color,box-shadow] duration-200 ease-out
        ${isActive
          ? 'bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/20 dark:text-orange-300'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
        }
        ${isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'}
      `}
    >
      <Icon
        size={16}
        strokeWidth={isActive ? 2.2 : 1.7}
        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
      />

      <span
        className={`
          font-semibold text-[11px] whitespace-nowrap tracking-wide
          transition-all duration-300 ease-out
          ${isCollapsed
            ? 'opacity-0 -translate-x-2 w-0 overflow-hidden'
            : 'opacity-100 translate-x-0'
          }
        `}
      >
        {item.label}
      </span>

      {isCollapsed && (
        <span className="
          absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-700
          text-white text-xs font-semibold rounded-lg whitespace-nowrap
          opacity-0 group-hover:opacity-100 transition-opacity duration-150
          pointer-events-none z-[600] shadow-lg
        ">
          {item.label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-800 dark:border-r-slate-700" />
        </span>
      )}
    </button>
  )
}

export default NavItemButton
