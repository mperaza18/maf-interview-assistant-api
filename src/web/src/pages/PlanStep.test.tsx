import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Dispatch } from 'react'
import { SessionContext } from '@/store/SessionContext'
import { PlanStep } from './PlanStep'
import * as api from '@/api/interviewApi'
import type { Session, InterviewPlan } from '@/types'
import type { SessionAction, SessionState } from '@/store/sessionReducer'

const mockPlan: InterviewPlan = {
  role: 'Senior React Developer',
  level: 'Senior',
  summary: 'Focus on system design and coding.',
  rounds: [
    { name: 'System Design', durationMinutes: 20, questions: ['Design a caching layer'] },
    { name: 'Coding', durationMinutes: 30, questions: ['Implement a debounce utility'] },
  ],
  rubric: [],
}

const baseSession: Session = {
  id: 'test-id',
  candidateName: 'Jane Doe',
  role: 'Senior React Developer',
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt: '2026-05-16T00:00:00.000Z',
  currentStep: 2,
  resumeText: 'Jane has 8 years of React experience.',
  notes: '',
  profile: {
    candidateName: 'Jane Doe',
    coreSkills: ['React'],
    roles: ['Senior Frontend Engineer'],
    notableProjects: [],
    redFlags: [],
  },
  seniority: { level: 'Senior', confidence: 0.9, rationale: 'strong' },
  plan: mockPlan,
}

function renderPlanStep(session: Session = baseSession) {
  const dispatch = vi.fn() as unknown as Dispatch<SessionAction>
  const state: SessionState = { current: session }
  const repository = { save: vi.fn(), load: vi.fn(), clear: vi.fn() } as any
  render(
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <PlanStep />
    </SessionContext.Provider>
  )
  return { dispatch }
}

beforeEach(() => vi.restoreAllMocks())

describe('PlanStep revise bar', () => {
  it('renders the "✦ Revise Plan" label', () => {
    renderPlanStep()
    expect(screen.getByText(/✦ Revise Plan/i)).toBeInTheDocument()
  })

  it('renders input with correct placeholder text', () => {
    renderPlanStep()
    expect(
      screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    ).toBeInTheDocument()
  })

  it('Revise button is disabled when input is empty', () => {
    renderPlanStep()
    expect(screen.getByRole('button', { name: /^revise$/i })).toBeDisabled()
  })

  it('Revise button becomes enabled when input has text', () => {
    renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more system design questions' } })
    expect(screen.getByRole('button', { name: /^revise$/i })).not.toBeDisabled()
  })

  it('dispatches SET_PLAN with revised plan on successful revision', async () => {
    const revisedPlan: InterviewPlan = { ...mockPlan, summary: 'Updated with more system design.' }
    vi.spyOn(api, 'revisePlan').mockResolvedValue(revisedPlan)
    const { dispatch } = renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more system design questions' } })
    fireEvent.click(screen.getByRole('button', { name: /^revise$/i }))
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAN', plan: revisedPlan })
    )
  })

  it('clears the input after successful revision', async () => {
    vi.spyOn(api, 'revisePlan').mockResolvedValue(mockPlan)
    renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more system design' } })
    fireEvent.click(screen.getByRole('button', { name: /^revise$/i }))
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
  })

  it('shows error banner on revision failure', async () => {
    vi.spyOn(api, 'revisePlan').mockRejectedValue(new Error('Revision failed. Please try again.'))
    renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more questions' } })
    fireEvent.click(screen.getByRole('button', { name: /^revise$/i }))
    await waitFor(() =>
      expect(screen.getByText(/revision failed/i)).toBeInTheDocument()
    )
  })

  it('shows "Revising..." on the button and disables it while revision is in progress', async () => {
    vi.spyOn(api, 'revisePlan').mockReturnValue(new Promise(() => {}))
    renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more questions' } })
    fireEvent.click(screen.getByRole('button', { name: /^revise$/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /revising/i })).toBeDisabled()
    )
  })

  it('submits revision on Enter key', async () => {
    const revisedPlan: InterviewPlan = { ...mockPlan, summary: 'Updated.' }
    vi.spyOn(api, 'revisePlan').mockResolvedValue(revisedPlan)
    const { dispatch } = renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more questions' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAN', plan: revisedPlan })
    )
  })
})

describe('PlanStep header — duration badge', () => {
  it('renders total duration by summing all round durationMinutes', () => {
    renderPlanStep()
    expect(screen.getByText('50 min total')).toBeInTheDocument()
  })
})

describe('PlanStep header — candidate chips', () => {
  it('renders the role chip below the heading', () => {
    renderPlanStep()
    expect(screen.getAllByText('Senior React Developer').length).toBeGreaterThan(0)
  })

  it('does not render the plan summary paragraph', () => {
    renderPlanStep()
    expect(screen.queryByText('Focus on system design and coding.')).not.toBeInTheDocument()
  })

  it('renders the top skills chip with coreSkills from profile', () => {
    renderPlanStep()
    expect(screen.getByText('React')).toBeInTheDocument()
  })
})

describe('PlanStep section cards', () => {
  it('renders category icon ⬡ for System Design round', () => {
    renderPlanStep()
    expect(screen.getByText('⬡')).toBeInTheDocument()
  })

  it('renders fallback icon ● for rounds with no matching category', () => {
    renderPlanStep()
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('renders per-round duration in each section card header', () => {
    renderPlanStep()
    expect(screen.getByText('(20 min)')).toBeInTheDocument()
    expect(screen.getByText('(30 min)')).toBeInTheDocument()
  })

  it('renders all question text inside section cards', () => {
    renderPlanStep()
    expect(screen.getByText('Design a caching layer')).toBeInTheDocument()
    expect(screen.getByText('Implement a debounce utility')).toBeInTheDocument()
  })
})
