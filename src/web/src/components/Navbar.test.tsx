import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/context/ThemeContext'
import { Navbar } from './Navbar'

function renderNavbar(onBack?: () => void) {
  localStorage.setItem('theme', 'dark')
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
  return render(<ThemeProvider><Navbar onBack={onBack} /></ThemeProvider>)
}

describe('Navbar', () => {
  beforeEach(() => localStorage.clear())

  it('renders the app title', () => {
    renderNavbar()
    expect(screen.getByText('Interview Assistant')).toBeInTheDocument()
  })

  it('renders the theme toggle button', () => {
    renderNavbar()
    expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument()
  })

  it('renders the back button when onBack is provided', () => {
    renderNavbar(vi.fn())
    expect(screen.getByRole('button', { name: '← Sessions' })).toBeInTheDocument()
  })

  it('does not render a back button when onBack is undefined', () => {
    renderNavbar()
    expect(screen.queryByRole('button', { name: '← Sessions' })).not.toBeInTheDocument()
  })

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn()
    renderNavbar(onBack)
    fireEvent.click(screen.getByRole('button', { name: '← Sessions' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
