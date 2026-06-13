import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JdMatchFlow } from './JdMatchFlow'
import { JdMatchProvider } from '@/store/JdMatchContext'

beforeEach(() => localStorage.clear())

describe('JdMatchFlow', () => {
  it('renders the header, the 3-step stepper with Upload JD active, and the dropzone', () => {
    render(
      <JdMatchProvider>
        <JdMatchFlow />
      </JdMatchProvider>,
    )
    expect(screen.getByText('New JD Match')).toBeInTheDocument()
    expect(screen.getByText('Upload JD')).toBeInTheDocument()
    expect(screen.getByText('Analyze')).toBeInTheDocument()
    expect(screen.getByText('Match Candidates')).toBeInTheDocument()
    expect(screen.getByText('Drag & drop your JD PDF here')).toBeInTheDocument()
  })
})
