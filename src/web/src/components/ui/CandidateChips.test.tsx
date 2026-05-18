import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CandidateChips } from './CandidateChips'

describe('CandidateChips', () => {
  it('renders the role chip', () => {
    render(<CandidateChips role="Senior React Developer" topSkills={[]} />)
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
  })

  it('renders years experience chip when provided', () => {
    render(<CandidateChips role="Engineer" yearsExperience={5} topSkills={[]} />)
    expect(screen.getByText('5 yrs exp')).toBeInTheDocument()
  })

  it('does not render years experience chip when undefined', () => {
    render(<CandidateChips role="Engineer" topSkills={[]} />)
    expect(screen.queryByText(/yrs exp/)).not.toBeInTheDocument()
  })

  it('renders top skills joined by " · "', () => {
    render(<CandidateChips role="Engineer" topSkills={['React', 'TypeScript', 'Node']} />)
    expect(screen.getByText('React · TypeScript · Node')).toBeInTheDocument()
  })

  it('shows only the first 3 skills when more than 3 are provided', () => {
    render(<CandidateChips role="Engineer" topSkills={['A', 'B', 'C', 'D']} />)
    expect(screen.getByText('A · B · C')).toBeInTheDocument()
    expect(screen.queryByText(/D/)).not.toBeInTheDocument()
  })

  it('renders no skills chip when topSkills is empty', () => {
    render(<CandidateChips role="Engineer" topSkills={[]} />)
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })
})
