import { NAV_ITEMS } from './navItems'
import { SidebarNavItem } from './SidebarNavItem'
import { UserFooter } from './UserFooter'

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-7">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-sm font-bold text-primary-foreground">
          SF
        </div>
        <span className="text-lg font-bold text-primary">SmartFitter</span>
      </div>

      <nav aria-label="Main navigation" className="mt-10 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mt-4 border-t border-sidebar-border pt-2">
        <UserFooter />
      </div>
    </aside>
  )
}
