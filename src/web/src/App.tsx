import { useReducer, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { SessionContext } from '@/store/SessionContext'
import { sessionReducer, initialState } from '@/store/sessionReducer'
import { LocalStorageSessionRepository } from '@/repositories/LocalStorageSessionRepository'
import { AppShell } from '@/components/shell/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { JobsPage } from '@/pages/JobsPage'
import { InterviewsPage } from '@/pages/InterviewsPage'
import { Placeholder } from '@/components/shell/Placeholder'

export default function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const repository = useMemo(() => new LocalStorageSessionRepository(), [])

  useEffect(() => {
    if (state.current) {
      repository.save(state.current)
    }
  }, [state.current, repository])

  return (
    <ThemeProvider>
      <SessionContext.Provider value={{ state, dispatch, repository }}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route
              path="/candidates"
              element={
                <Placeholder
                  title="Candidate Matches"
                  description="Ranked candidate matches will appear here."
                />
              }
            />
            <Route path="/interviews" element={<InterviewsPage />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </SessionContext.Provider>
    </ThemeProvider>
  )
}
