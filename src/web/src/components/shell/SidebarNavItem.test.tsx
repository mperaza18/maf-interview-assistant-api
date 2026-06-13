import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { SidebarNavItem } from './SidebarNavItem'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarNavItem to="/jobs" label="Jobs & JDs" icon={Briefcase} />
    </MemoryRouter>,
  )
}

describe('SidebarNavItem', () => {
  it('renders the label and links to the route', () => {
    renderAt('/dashboard')
    const link = screen.getByRole('link', { name: 'Jobs & JDs' })
    expect(link).toHaveAttribute('href', '/jobs')
  })

  it('marks itself active when the route matches', () => {
    renderAt('/jobs')
    const link = screen.getByRole('link', { name: 'Jobs & JDs' })
    expect(link.className).toContain('bg-sidebar-active-bg')
  })

  it('is not active on a different route', () => {
    renderAt('/dashboard')
    const link = screen.getByRole('link', { name: 'Jobs & JDs' })
    expect(link.className).not.toContain('bg-sidebar-active-bg')
  })
})
