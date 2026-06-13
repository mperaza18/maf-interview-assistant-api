import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

function renderSidebar(path = '/dashboard') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('renders the SmartFitter brand', () => {
    renderSidebar()
    expect(screen.getByText('SmartFitter')).toBeInTheDocument()
  })

  it('renders all five nav items', () => {
    renderSidebar()
    for (const label of ['Dashboard', 'Jobs & JDs', 'Candidates', 'Interviews', 'Settings']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('renders the user footer', () => {
    renderSidebar()
    expect(screen.getByText('HR Manager')).toBeInTheDocument()
  })
})
