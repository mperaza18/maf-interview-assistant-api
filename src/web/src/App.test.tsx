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
  it('renders the dashboard (session list) at /dashboard', () => {
    renderAppAt('/dashboard')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })

  it('redirects the index route to the dashboard', () => {
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

  it('redirects /interviews to the dashboard when no session is active', () => {
    renderAppAt('/interviews')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })

  it('redirects unknown routes to the dashboard', () => {
    renderAppAt('/does-not-exist')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })
})
