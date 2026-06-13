import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Placeholder } from './Placeholder'

describe('Placeholder', () => {
  it('renders the title and a coming soon message', () => {
    render(<Placeholder title="Settings" />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('renders a custom description when provided', () => {
    render(<Placeholder title="Candidate Matches" description="Ranked candidates will appear here." />)
    expect(screen.getByText('Ranked candidates will appear here.')).toBeInTheDocument()
  })
})
