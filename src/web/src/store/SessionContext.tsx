import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { SessionAction, SessionState } from './sessionReducer'
import type { SessionRepository } from '../repositories/SessionRepository'

interface SessionContextValue {
  state: SessionState
  dispatch: Dispatch<SessionAction>
  repository: SessionRepository
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionContext.Provider')
  return ctx
}
