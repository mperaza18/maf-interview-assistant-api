import { useReducer, useState, useEffect, useMemo } from 'react'
import { SessionContext } from '@/store/SessionContext'
import { sessionReducer, initialState } from '@/store/sessionReducer'
import { LocalStorageSessionRepository } from '@/repositories/LocalStorageSessionRepository'
import { HomeScreen } from '@/pages/HomeScreen'
import { AnalyzeStep } from '@/pages/AnalyzeStep'
import { PlanStep } from '@/pages/PlanStep'
import { SessionStep } from '@/pages/SessionStep'
import { EvaluationStep } from '@/pages/EvaluationStep'
import { Stepper } from '@/components/Stepper'
import type { Session } from '@/types'

type View = 'home' | 'wizard'

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
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {view === 'home' ? (
            <HomeScreen onNew={handleNew} onLoad={handleLoad} />
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={handleBackToHome}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← Sessions
                </button>
                <h1 className="text-lg font-bold text-slate-100">Interview Assistant</h1>
                <div className="w-24" />
              </div>
              <Stepper currentStep={step} />
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
  )
}
