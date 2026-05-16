import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Dispatch } from 'react'
import { SessionContext } from '@/store/SessionContext'
import { AnalyzeStep } from './AnalyzeStep'
import * as api from '@/api/interviewApi'
import type { Session, ResumeProfile, SeniorityAssessment } from '@/types'
import type { SessionAction, SessionState } from '@/store/sessionReducer'

const mockProfile: ResumeProfile = {
  candidateName: 'Jane Doe',
  coreSkills: ['React'],
  roles: [],
  notableProjects: [],
  redFlags: [],
}
const mockSeniority: SeniorityAssessment = { level: 'Senior', confidence: 0.9, rationale: 'strong' }

const baseSession: Session = {
  id: 'test-id',
  candidateName: '',
  role: 'Software Engineer',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
  currentStep: 1,
  resumeText: '',
  notes: '',
}

function renderAnalyzeStep(session: Session = baseSession) {
  const dispatch = vi.fn() as unknown as Dispatch<SessionAction>
  const state: SessionState = { current: session }
  const repository = { save: vi.fn(), load: vi.fn(), clear: vi.fn() } as any
  render(
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <AnalyzeStep />
    </SessionContext.Provider>
  )
  return { dispatch }
}

beforeEach(() => vi.restoreAllMocks())

describe('AnalyzeStep', () => {
  it('renders an upload button and no resume textarea', () => {
    renderAnalyzeStep()
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /resume/i })).not.toBeInTheDocument()
  })

  it('has a hidden file input that accepts PDF only', () => {
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.accept).toBe('.pdf')
  })

  it('shows spinner and disables button while uploading', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockReturnValue(new Promise(() => {}))
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
    )
  })

  it('shows green check and dispatches LOAD_SESSION on success', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockResolvedValue({
      profile: mockProfile,
      seniority: mockSeniority,
    })
    const { dispatch } = renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(screen.getByText('✓')).toBeInTheDocument())
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOAD_SESSION' })
    )
  })

  it('shows red X and 422 message on unreadable PDF', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockRejectedValue(
      new api.ApiError(422, 'no text')
    )
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(screen.getByText('✗')).toBeInTheDocument())
    expect(screen.getByText(/doesn't contain readable text/i)).toBeInTheDocument()
  })

  it('"Try another file" resets state back to idle', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockRejectedValue(
      new api.ApiError(422, 'no text')
    )
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => screen.getByText(/try another file/i))
    fireEvent.click(screen.getByText(/try another file/i))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /upload pdf/i })).not.toBeDisabled()
    )
    expect(screen.queryByText('✗')).not.toBeInTheDocument()
  })
})
