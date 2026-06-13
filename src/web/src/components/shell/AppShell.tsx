import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="flex justify-end px-10 pt-6">
          <ThemeToggle />
        </div>
        <div className="px-10 pb-10 pt-2">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
