import { LayoutDashboard, Briefcase, Users, ClipboardList, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs & JDs', icon: Briefcase },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/interviews', label: 'Interviews', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings },
]
