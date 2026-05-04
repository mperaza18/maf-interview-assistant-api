import type { Session } from '../types'
import type { SessionRepository } from './SessionRepository'

const STORAGE_KEY = 'interview_sessions'

// Monotonic counter ensures save() always produces a strictly-increasing
// updatedAt, even when two saves happen within the same millisecond.
let _lastTs = 0
function nowIso(): string {
  const ts = Math.max(Date.now(), _lastTs + 1)
  _lastTs = ts
  return new Date(ts).toISOString()
}

function readStore(): Record<string, Session> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, Session>) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, Session>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export class LocalStorageSessionRepository implements SessionRepository {
  save(session: Session): void {
    const store = readStore()
    store[session.id] = { ...session, updatedAt: nowIso() }
    writeStore(store)
  }

  load(id: string): Session | null {
    return readStore()[id] ?? null
  }

  list(): Session[] {
    return Object.values(readStore()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  delete(id: string): void {
    const store = readStore()
    delete store[id]
    writeStore(store)
  }
}
