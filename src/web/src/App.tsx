import { useReducer, useState, useEffect, useMemo } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import { SessionContext } from '@/store/SessionContext'
import { sessionReducer, initialState } from '@/store/sessionReducer'
import { LocalStorageSessionRepository } from '@/repositories/LocalStorageSessionRepository'
import { HomeScreen } from '@/pages/HomeScreen'
import { AnalyzeStep } from '@/pages/AnalyzeStep'
import { PlanStep } from '@/pages/PlanStep'
import { SessionStep } from '@/pages/SessionStep'
import { EvaluationStep } from '@/pages/EvaluationStep'
import { Stepper } from '@/components/Stepper'
import { Navbar } from '@/components/Navbar'
import { JdMatchProvider } from '@/store/JdMatchContext'
import { JdMatchFlow } from '@/pages/JdMatchFlow'
import type { Session } from '@/types'

type View = 'home' | 'wizard' | 'jdMatch'

export default function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const [view, setView] = useState<View>('home')
  const repository = useMemo(() => new LocalStorageSessionRepository(), [])

  useEffect(() => {
    if (state.current) {
      repository.save(state.current)
    }
  }, [state.current, repository])

  function handleNew() {
    const session: Session = {
      id: crypto.randomUUID(),
      candidateName: '',
      role: 'Software Engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 1,
      resumeText: '',
      notes: '',
      roundNotes: {},
    }
    dispatch({ type: 'CREATE_SESSION', session })
    setView('wizard')
  }

  function handleLoad(id: string) {
    const session = repository.load(id)
    if (session) {
      dispatch({ type: 'LOAD_SESSION', session })
      setView('wizard')
    }
  }

  function handleBackToHome() {
    setView('home')
  }

  const step = state.current?.currentStep ?? 1

  return (
    <ThemeProvider>
      <SessionContext.Provider value={{ state, dispatch, repository }}>
        <div className="min-h-screen bg-background text-foreground">
          <div className="mx-auto max-w-[760px] px-4 py-8">
            <Navbar onBack={view !== 'home' ? handleBackToHome : undefined} />
            {view === 'home' && (
              <HomeScreen onNew={handleNew} onLoad={handleLoad} onNewJdMatch={() => setView('jdMatch')} />
            )}
            {view === 'jdMatch' && (
              <JdMatchProvider>
                <JdMatchFlow />
              </JdMatchProvider>
            )}
            {view === 'wizard' && (
              <>
                <Stepper
                  currentStep={step}
                  onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s as 1 | 2 | 3 | 4 })}
                />
                <div className="mt-8">
                  {step === 1 && <AnalyzeStep />}
                  {step === 2 && <PlanStep />}
                  {step === 3 && <SessionStep />}
                  {step === 4 && <EvaluationStep onBackToHome={handleBackToHome} />}
                </div>
              </>
            )}
          </div>
        </div>
      </SessionContext.Provider>
    </ThemeProvider>
  )
}
