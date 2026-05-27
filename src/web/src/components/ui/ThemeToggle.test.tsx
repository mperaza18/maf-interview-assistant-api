import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/context/ThemeContext'
import { ThemeToggle } from './ThemeToggle'

function renderWithTheme(initialTheme: 'light' | 'dark') {
  localStorage.setItem('theme', initialTheme)
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
  return render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
}

describe('ThemeToggle', () => {
  beforeEach(() => localStorage.clear())

  it('renders a button', () => {
    renderWithTheme('dark')
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has aria-label "Switch to light mode" when in dark mode', () => {
    renderWithTheme('dark')
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('has aria-label "Switch to dark mode" when in light mode', () => {
    renderWithTheme('light')
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('toggles aria-label when clicked', () => {
    renderWithTheme('dark')
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-label', 'Switch to dark mode')
  })
})
