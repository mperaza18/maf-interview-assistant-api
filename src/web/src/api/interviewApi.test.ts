import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeResume, generatePlan, revisePlan, evaluate, ApiError } from './interviewApi'
import type { ResumeProfile, SeniorityAssessment, InterviewPlan } from '../types'

const mockProfile: ResumeProfile = {
  candidateName: 'Jane Doe',
  coreSkills: ['React'],
  roles: [],
  notableProjects: [],
  redFlags: [],
}
const mockSeniority: SeniorityAssessment = { level: 'Senior', confidence: 0.9, rationale: 'strong background' }
const mockPlan: InterviewPlan = { role: 'Engineer', level: 'Senior', summary: 'A plan', rounds: [], rubric: [] }

function mockFetch(status: number, body: unknown) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response)
}

beforeEach(() => vi.restoreAllMocks())

describe('analyzeResume', () => {
  it('POSTs to /api/interview/analyze and returns parsed response', async () => {
    const response = { profile: mockProfile, seniority: mockSeniority }
    mockFetch(200, response)
    const result = await analyzeResume('resume text', 'Engineer')
    expect(result).toEqual(response)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interview/analyze'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws ApiError on non-2xx response', async () => {
    mockFetch(400, { message: 'bad request' })
    await expect(analyzeResume('', 'Engineer')).rejects.toBeInstanceOf(ApiError)
  })

  it('ApiError carries the status code', async () => {
    mockFetch(500, 'server error')
    try {
      await analyzeResume('text', 'Engineer')
    } catch (e) {
      expect((e as ApiError).status).toBe(500)
    }
  })
})

describe('generatePlan', () => {
  it('POSTs to /api/interview/plan with mode=simple', async () => {
    mockFetch(200, mockPlan)
    const result = await generatePlan(mockProfile, mockSeniority, 'Engineer')
    expect(result).toEqual(mockPlan)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interview/plan'),
      expect.objectContaining({
        body: expect.stringContaining('"mode":"simple"'),
      })
    )
  })
})

describe('revisePlan', () => {
  it('POSTs to /api/interview/plan/revise and returns revised plan', async () => {
    const revised = { ...mockPlan, summary: 'Revised plan' }
    mockFetch(200, revised)
    const result = await revisePlan(mockPlan, 'more system design')
    expect(result).toEqual(revised)
  })
})

describe('evaluate', () => {
  it('POSTs to /api/interview/evaluate and returns evaluation', async () => {
    const evaluation = { overallScore: 85, recommendation: 'Hire', summary: 'Good', strengths: [], risks: [], followUps: [] }
    mockFetch(200, evaluation)
    const result = await evaluate(mockProfile, mockPlan, 'good answers')
    expect(result).toEqual(evaluation)
  })
})
