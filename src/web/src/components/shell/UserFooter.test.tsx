import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserFooter } from './UserFooter'

describe('UserFooter', () => {
  it('renders the user name, email and avatar initials', () => {
    render(<UserFooter />)
    expect(screen.getByText('HR Manager')).toBeInTheDocument()
    expect(screen.getByText('hr@smartfitter.com')).toBeInTheDocument()
    expect(screen.getByText('HR')).toBeInTheDocument()
  })
})
