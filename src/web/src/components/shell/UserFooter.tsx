export function UserFooter() {
  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sidebar-border bg-muted text-xs font-semibold text-sidebar-muted-fg">
        HR
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">HR Manager</p>
        <p className="truncate text-xs text-sidebar-muted-fg">hr@smartfitter.com</p>
      </div>
    </div>
  )
}
