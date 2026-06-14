import { describe, it, expect } from 'vitest'
import { jdMatchReducer, initialJdMatchState } from './jdMatchReducer'
import type { JobDescriptionUpload } from '../types'

const upload: JobDescriptionUpload = {
  id: 'abc-123',
  fileName: 'senior-jd.pdf',
  sizeBytes: 2048,
  status: 'parsed',
  uploadedAt: '2026-06-11T12:00:00Z',
}

describe('jdMatchReducer', () => {
  it('starts with no job description on step 1', () => {
    expect(initialJdMatchState).toEqual({ jobDescription: null, analysisResult: null, currentStep: 1 })
  })

  it('SET_JOB_DESCRIPTION stores the upload', () => {
    const state = jdMatchReducer(initialJdMatchState, {
      type: 'SET_JOB_DESCRIPTION',
      jobDescription: upload,
    })
    expect(state.jobDescription).toEqual(upload)
    expect(state.currentStep).toBe(1)
  })

  it('RESET returns to the initial state', () => {
    const populated = jdMatchReducer(initialJdMatchState, {
      type: 'SET_JOB_DESCRIPTION',
      jobDescription: upload,
    })
    expect(jdMatchReducer(populated, { type: 'RESET' })).toEqual(initialJdMatchState)
  })
})
