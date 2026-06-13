import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

beforeEach(() => {
  localStorage.clear()
})

function renderAppAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('renders the coming-soon Dashboard placeholder at /dashboard', () => {
    renderAppAt('/dashboard')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('renders the interview session list at /interviews when no session is active', () => {
    renderAppAt('/interviews')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })

  it('does not show the New JD Match button on the interviews page', () => {
    renderAppAt('/interviews')
    expect(screen.queryByText('+ New JD Match')).not.toBeInTheDocument()
  })

  it('redirects the index route to the interviews session list', () => {
    renderAppAt('/')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })

  it('renders the JD match flow at /jobs', () => {
    renderAppAt('/jobs')
    expect(screen.getByText('New JD Match')).toBeInTheDocument()
  })

  it('renders the Settings placeholder at /settings', () => {
    renderAppAt('/settings')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('redirects unknown routes to the interviews session list', () => {
    renderAppAt('/does-not-exist')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })
})
