import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavItem } from './navItems'

export function SidebarNavItem({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-active-bg font-semibold text-sidebar-active-fg'
            : 'font-medium text-sidebar-muted-fg hover:text-foreground',
        )
      }
    >
      <Icon size={18} aria-hidden />
      <span>{label}</span>
    </NavLink>
  )
}
