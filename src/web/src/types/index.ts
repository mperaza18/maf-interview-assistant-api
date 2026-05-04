export interface ResumeProfile {
  candidateName: string
  email?: string
  currentTitle?: string
  yearsExperience?: number
  coreSkills: string[]
  roles: string[]
  notableProjects: string[]
  redFlags: string[]
}

export interface SeniorityAssessment {
  level: string
  confidence: number
  rationale: string
}

export interface InterviewRound {
  name: string
  durationMinutes: number
  questions: string[]
}

export interface RubricItem {
  dimension: string
  signals: string[]
}

export interface InterviewPlan {
  role: string
  level: string
  summary: string
  rounds: InterviewRound[]
  rubric: RubricItem[]
}

export interface EvaluationResult {
  overallScore: number
  recommendation: string
  summary: string
  strengths: string[]
  risks: string[]
  followUps: string[]
}

export interface AnalyzeResumeResponse {
  profile: ResumeProfile
  seniority: SeniorityAssessment
}

export interface Session {
  id: string
  candidateName: string
  role: string
  createdAt: string
  updatedAt: string
  currentStep: 1 | 2 | 3 | 4
  resumeText: string
  profile?: ResumeProfile
  seniority?: SeniorityAssessment
  plan?: InterviewPlan
  notes: string
  evaluation?: EvaluationResult
}
