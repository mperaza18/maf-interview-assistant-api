import type { JobDescriptionUpload, JdAnalysisResult } from '../types'

export type JdMatchAction =
  | { type: 'SET_JOB_DESCRIPTION'; jobDescription: JobDescriptionUpload }
  | { type: 'SET_ANALYSIS'; analysisResult: JdAnalysisResult }
  | { type: 'RESET' }

export interface JdMatchState {
  jobDescription: JobDescriptionUpload | null
  analysisResult: JdAnalysisResult | null
  currentStep: number
}

export const initialJdMatchState: JdMatchState = {
  jobDescription: null,
  analysisResult: null,
  currentStep: 1,
}

export function jdMatchReducer(state: JdMatchState, action: JdMatchAction): JdMatchState {
  switch (action.type) {
    case 'SET_JOB_DESCRIPTION':
      return { ...state, jobDescription: action.jobDescription }

    case 'SET_ANALYSIS':
      return { ...state, analysisResult: action.analysisResult, currentStep: 2 }

    case 'RESET':
      return initialJdMatchState

    default:
      return state
  }
}
