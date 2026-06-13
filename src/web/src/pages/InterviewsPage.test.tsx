import { describe, it, expect, vi } from 'vitest'
import type { Dispatch } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SessionContext } from '@/store/SessionContext'
import { InterviewsPage } from './InterviewsPage'
import type { Session } from '@/types'
import type { SessionAction, SessionState } from '@/store/sessionReducer'

const session: Session = {
  id: 'test-id',
  candidateName: '',
  role: 'Software Engineer',
  createdAt: '2026-06-12T00:00:00.000Z',
  updatedAt: '2026-06-12T00:00:00.000Z',
  currentStep: 1,
  resumeText: '',
  notes: '',
  roundNotes: {},
}

function renderInterviews(state: SessionState) {
  const dispatch = vi.fn() as unknown as Dispatch<SessionAction>
  const repository = { save: vi.fn(), load: vi.fn(), list: vi.fn(() => []), delete: vi.fn() } as any
  render(
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <MemoryRouter initialEntries={['/interviews']}>
        <InterviewsPage />
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

describe('InterviewsPage', () => {
  it('renders the wizard stepper when a session exists', () => {
    renderInterviews({ current: session })
    expect(screen.getByText('Resume Analysis')).toBeInTheDocument()
  })

  it('renders the session list when there is no active session', () => {
    renderInterviews({ current: null })
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })

  it('does not show the New JD Match button in the session list', () => {
    renderInterviews({ current: null })
    expect(screen.queryByText('+ New JD Match')).not.toBeInTheDocument()
  })
})
