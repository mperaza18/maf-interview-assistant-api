import { describe, it, expect } from 'vitest'
import { sessionReducer, initialState } from './sessionReducer'
import type { Session } from '../types'

const baseSession: Session = {
  id: 'test-id',
  candidateName: '',
  role: 'Engineer',
  createdAt: '2026-05-03T00:00:00.000Z',
  updatedAt: '2026-05-03T00:00:00.000Z',
  currentStep: 1,
  resumeText: '',
  notes: '',
}

const profile = {
  candidateName: 'Jane Doe',
  coreSkills: ['React'],
  roles: [],
  notableProjects: [],
  redFlags: [],
}
const seniority = { level: 'Senior', confidence: 0.9, rationale: 'strong' }
const plan = { role: 'Engineer', level: 'Senior', summary: 'Plan', rounds: [], rubric: [] }
const evaluation = { overallScore: 85, recommendation: 'Hire', summary: 'Good', strengths: [], risks: [], followUps: [] }

describe('sessionReducer', () => {
  it('starts with null current session', () => {
    expect(initialState.current).toBeNull()
  })

  it('CREATE_SESSION sets the current session', () => {
    const state = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    expect(state.current?.id).toBe('test-id')
  })

  it('LOAD_SESSION replaces the current session', () => {
    const first = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const loaded: Session = { ...baseSession, id: 'other-id' }
    const state = sessionReducer(first, { type: 'LOAD_SESSION', session: loaded })
    expect(state.current?.id).toBe('other-id')
  })

  it('SET_PROFILE stores profile, seniority, and candidateName', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_PROFILE', profile, seniority })
    expect(state.current?.profile).toEqual(profile)
    expect(state.current?.seniority).toEqual(seniority)
    expect(state.current?.candidateName).toBe('Jane Doe')
  })

  it('SET_PROFILE does not change currentStep', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_PROFILE', profile, seniority })
    expect(state.current?.currentStep).toBe(1)
  })

  it('SET_PLAN stores the plan without changing step', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_PLAN', plan })
    expect(state.current?.plan).toEqual(plan)
    expect(state.current?.currentStep).toBe(1)
  })

  it('SET_NOTES stores notes', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_NOTES', notes: 'Great answers' })
    expect(state.current?.notes).toBe('Great answers')
  })

  it('SET_EVALUATION stores the evaluation without changing step', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_EVALUATION', evaluation })
    expect(state.current?.evaluation).toEqual(evaluation)
    expect(state.current?.currentStep).toBe(1)
  })

  it('SET_STEP advances currentStep', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_STEP', step: 3 })
    expect(state.current?.currentStep).toBe(3)
  })

  it('CLEAR_SESSION nulls the current session', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'CLEAR_SESSION' })
    expect(state.current).toBeNull()
  })

  it('actions on null session return unchanged state', () => {
    const state = sessionReducer(initialState, { type: 'SET_NOTES', notes: 'x' })
    expect(state.current).toBeNull()
  })
})
