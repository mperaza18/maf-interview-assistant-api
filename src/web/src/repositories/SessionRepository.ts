import type { Session } from '../types'

export interface SessionRepository {
  save(session: Session): void
  load(id: string): Session | null
  list(): Session[]
  delete(id: string): void
}
