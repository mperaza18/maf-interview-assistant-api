import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBadge, SeniorityBadge, ConfidenceBadge } from './StatBadge'

describe('StatBadge', () => {
  it('renders label text', () => {
    render(<StatBadge label="SENIORITY" value="Senior" colorScheme="purple" />)
    expect(screen.getByText('SENIORITY')).toBeInTheDocument()
  })

  it('renders value text', () => {
    render(<StatBadge label="SENIORITY" value="Senior" colorScheme="purple" />)
    expect(screen.getByText('Senior')).toBeInTheDocument()
  })
})

describe('SeniorityBadge', () => {
  function getBadge(level: string) {
    const { container } = render(<SeniorityBadge level={level} />)
    return container.querySelector('[data-testid="stat-badge"]')!
  }

  it.each([['Senior'], ['Architect'], ['Software Designer']])(
    '%s maps to purple',
    (level) => {
      expect(getBadge(level).className).toContain('bg-purple-500/20')
    }
  )

  it.each([['Semi Senior'], ['Semi Senior Adv']])(
    '%s maps to blue',
    (level) => {
      expect(getBadge(level).className).toContain('bg-blue-500/20')
    }
  )

  it.each([['Junior'], ['Trainee'], ['unknown-level']])(
    '%s maps to gray (default)',
    (level) => {
      expect(getBadge(level).className).toContain('bg-slate-500/20')
    }
  )
})

describe('ConfidenceBadge', () => {
  function getBadge(confidence: number) {
    const { container } = render(<ConfidenceBadge confidence={confidence} />)
    return container.querySelector('[data-testid="stat-badge"]')!
  }

  it.each([[0.95], [0.80]])('%s maps to green', (confidence) => {
    expect(getBadge(confidence).className).toContain('bg-emerald-500/20')
  })

  it.each([[0.70], [0.60]])('%s maps to yellow', (confidence) => {
    expect(getBadge(confidence).className).toContain('bg-yellow-500/20')
  })

  it('0.45 maps to red', () => {
    expect(getBadge(0.45).className).toContain('bg-red-500/20')
  })

  it('formats confidence as a percentage string', () => {
    render(<ConfidenceBadge confidence={0.95} />)
    expect(screen.getByText('95%')).toBeInTheDocument()
  })
})
