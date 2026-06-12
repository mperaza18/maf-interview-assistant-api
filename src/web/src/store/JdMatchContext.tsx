import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { jdMatchReducer, initialJdMatchState } from './jdMatchReducer'
import type { JdMatchAction, JdMatchState } from './jdMatchReducer'

const STORAGE_KEY = 'jd-match:current'

interface JdMatchContextValue {
  state: JdMatchState
  dispatch: Dispatch<JdMatchAction>
}

const JdMatchContext = createContext<JdMatchContextValue | null>(null)

function loadInitialState(): JdMatchState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as JdMatchState) : initialJdMatchState
  } catch {
    return initialJdMatchState
  }
}

export function JdMatchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(jdMatchReducer, undefined, loadInitialState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return <JdMatchContext.Provider value={{ state, dispatch }}>{children}</JdMatchContext.Provider>
}

export function useJdMatch(): JdMatchContextValue {
  const ctx = useContext(JdMatchContext)
  if (!ctx) throw new Error('useJdMatch must be used within a JdMatchProvider')
  return ctx
}
