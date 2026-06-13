import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppShell } from './AppShell'

function renderShell() {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('AppShell', () => {
  it('renders the sidebar', () => {
    renderShell()
    expect(screen.getByText('SmartFitter')).toBeInTheDocument()
  })

  it('renders the routed outlet content', () => {
    renderShell()
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('renders the theme toggle', () => {
    renderShell()
    expect(screen.getByRole('button', { name: /switch to (light|dark) mode/i })).toBeInTheDocument()
  })
})
