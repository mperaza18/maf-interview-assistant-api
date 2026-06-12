import type { JobDescriptionUpload } from '../types'

export type JdMatchAction =
  | { type: 'SET_JOB_DESCRIPTION'; jobDescription: JobDescriptionUpload }
  | { type: 'RESET' }

export interface JdMatchState {
  jobDescription: JobDescriptionUpload | null
  currentStep: number
}

export const initialJdMatchState: JdMatchState = { jobDescription: null, currentStep: 1 }

export function jdMatchReducer(state: JdMatchState, action: JdMatchAction): JdMatchState {
  switch (action.type) {
    case 'SET_JOB_DESCRIPTION':
      return { ...state, jobDescription: action.jobDescription }

    case 'RESET':
      return initialJdMatchState

    default:
      return state
  }
}
