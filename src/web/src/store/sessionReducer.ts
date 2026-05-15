import type { EvaluationResult, InterviewPlan, ResumeProfile, SeniorityAssessment, Session } from '../types'

export type SessionAction =
  | { type: 'CREATE_SESSION'; session: Session }
  | { type: 'LOAD_SESSION'; session: Session }
  | { type: 'SET_PROFILE'; profile: ResumeProfile; seniority: SeniorityAssessment }
  | { type: 'SET_PLAN'; plan: InterviewPlan }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_ROUND_NOTE'; roundName: string; note: string }
  | { type: 'SET_EVALUATION'; evaluation: EvaluationResult }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'CLEAR_SESSION' }

export interface SessionState {
  current: Session | null
}

export const initialState: SessionState = { current: null }

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'CREATE_SESSION':
    case 'LOAD_SESSION':
      return { current: action.session }

    case 'SET_PROFILE':
      if (!state.current) return state
      return {
        current: {
          ...state.current,
          profile: action.profile,
          seniority: action.seniority,
          candidateName: action.profile.candidateName,
        },
      }

    case 'SET_PLAN':
      if (!state.current) return state
      return { current: { ...state.current, plan: action.plan } }

    case 'SET_NOTES':
      if (!state.current) return state
      return { current: { ...state.current, notes: action.notes } }

    case 'SET_ROUND_NOTE':
      if (!state.current) return state
      return {
        current: {
          ...state.current,
          roundNotes: { ...state.current.roundNotes, [action.roundName]: action.note },
        },
      }

    case 'SET_EVALUATION':
      if (!state.current) return state
      return { current: { ...state.current, evaluation: action.evaluation } }

    case 'SET_STEP':
      if (!state.current) return state
      return { current: { ...state.current, currentStep: action.step } }

    case 'CLEAR_SESSION':
      return { current: null }

    default:
      return state
  }
}
