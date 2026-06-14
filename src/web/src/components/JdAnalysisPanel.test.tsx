import { beforeEach, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JdAnalysisPanel } from './JdAnalysisPanel'
import { JdMatchProvider } from '@/store/JdMatchContext'
import type { JdAnalysisResult } from '@/types'

const STORAGE_KEY = 'jd-match:current'

function renderWithAnalysis(result: JdAnalysisResult) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ jobDescription: null, analysisResult: result, currentStep: 2 }),
  )
  return render(
    <JdMatchProvider>
      <JdAnalysisPanel />
    </JdMatchProvider>,
  )
}

const mockResult: JdAnalysisResult = {
  score: 88,
  seniority: 'Senior',
  mustHave: ['C#', '.NET', 'Azure'],
  niceToHave: ['Docker', 'Kubernetes'],
  summary: 'Seeks a senior backend engineer to own .NET microservices on Azure.',
  confidence: 0.92,
}

beforeEach(() => {
  localStorage.clear()
})

describe('JdAnalysisPanel', () => {
  it('renders the "Analysis complete" status badge', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByText(/Analysis complete/)).toBeInTheDocument()
  })

  it('renders the score ring with correct aria-label', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByLabelText('JD quality score: 88 out of 100')).toBeInTheDocument()
  })

  it('renders the seniority label', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByTestId('seniority-label')).toHaveTextContent('Senior')
  })

  it('renders the confidence percentage', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByTestId('confidence-label')).toHaveTextContent('92%')
  })

  it('clamps confidence above 100%', () => {
    renderWithAnalysis({ ...mockResult, confidence: 1.4 })
    expect(screen.getByText('Confidence: 100%')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-label')).toHaveTextContent('100%')
  })

  it('renders non-finite confidence as 0%', () => {
    renderWithAnalysis({ ...mockResult, confidence: Number.NaN })
    expect(screen.getByText('Confidence: 0%')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-label')).toHaveTextContent('0%')
  })

  it('renders all must-have chips', () => {
    renderWithAnalysis(mockResult)
    const container = screen.getByTestId('must-have-chips')
    expect(container.children).toHaveLength(3)
    expect(screen.getByText('C#')).toBeInTheDocument()
    expect(screen.getByText('.NET')).toBeInTheDocument()
    expect(screen.getByText('Azure')).toBeInTheDocument()
  })

  it('renders all nice-to-have chips', () => {
    renderWithAnalysis(mockResult)
    const container = screen.getByTestId('nice-to-have-chips')
    expect(container.children).toHaveLength(2)
    expect(screen.getByText('Docker')).toBeInTheDocument()
    expect(screen.getByText('Kubernetes')).toBeInTheDocument()
  })

  it('renders the JD summary text', () => {
    renderWithAnalysis(mockResult)
    expect(
      screen.getByText('Seeks a senior backend engineer to own .NET microservices on Azure.'),
    ).toBeInTheDocument()
  })

  it('renders a disabled Match Candidates button', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByRole('button', { name: /Match Candidates/ })).toBeDisabled()
  })

  it('renders nothing when analysisResult is null', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ jobDescription: null, analysisResult: null, currentStep: 1 }),
    )
    const { container } = render(
      <JdMatchProvider>
        <JdAnalysisPanel />
      </JdMatchProvider>,
    )
    expect(container.firstChild).toBeNull()
  })
})
