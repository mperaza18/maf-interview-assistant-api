import type { AnalyzeResumeResponse, EvaluationResult, InterviewPlan, ResumeProfile, SeniorityAssessment } from '../types'

const baseUrl = () => (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5001'

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: string) {
    super(`API error ${status}: ${body}`)
    this.name = 'ApiError'
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}/api/interview/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return JSON.parse(text) as T
}

export const analyzeResume = (resumeText: string, role: string): Promise<AnalyzeResumeResponse> =>
  post('analyze', { resumeText, role })

export const generatePlan = (
  profile: ResumeProfile,
  seniority: SeniorityAssessment,
  role: string,
): Promise<InterviewPlan> =>
  post('plan', { profile, seniority, role, mode: 'simple' })

export const revisePlan = (plan: InterviewPlan, feedback: string): Promise<InterviewPlan> =>
  post('plan/revise', { plan, feedback })

export const evaluate = (
  profile: ResumeProfile,
  plan: InterviewPlan,
  notes: string,
): Promise<EvaluationResult> =>
  post('evaluate', { profile, plan, notes })
