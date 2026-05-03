import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageSessionRepository } from './LocalStorageSessionRepository'
import type { Session } from '../types'

function makeSession(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    candidateName: 'Test User',
    role: 'Engineer',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    currentStep: 1,
    resumeText: '',
    notes: '',
    ...overrides,
  }
}

beforeEach(() => localStorage.clear())

describe('LocalStorageSessionRepository', () => {
  it('saves and loads a session by id', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('abc'))
    const loaded = repo.load('abc')
    expect(loaded?.id).toBe('abc')
    expect(loaded?.candidateName).toBe('Test User')
  })

  it('returns null for an unknown id', () => {
    const repo = new LocalStorageSessionRepository()
    expect(repo.load('unknown')).toBeNull()
  })

  it('lists sessions sorted by updatedAt descending', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('older', { updatedAt: '2026-05-01T00:00:00.000Z' }))
    repo.save(makeSession('newer', { updatedAt: '2026-05-03T00:00:00.000Z' }))
    const list = repo.list()
    expect(list[0].id).toBe('newer')
    expect(list[1].id).toBe('older')
  })

  it('deletes a session by id', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('to-delete'))
    repo.delete('to-delete')
    expect(repo.load('to-delete')).toBeNull()
    expect(repo.list()).toHaveLength(0)
  })

  it('save updates the updatedAt timestamp', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('x', { updatedAt: '2020-01-01T00:00:00.000Z' }))
    const loaded = repo.load('x')!
    expect(loaded.updatedAt).not.toBe('2020-01-01T00:00:00.000Z')
  })

  it('overwrites an existing session on re-save', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('y', { candidateName: 'First' }))
    repo.save(makeSession('y', { candidateName: 'Updated' }))
    expect(repo.load('y')?.candidateName).toBe('Updated')
    expect(repo.list()).toHaveLength(1)
  })
})
