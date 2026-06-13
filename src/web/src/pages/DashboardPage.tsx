import { useNavigate } from 'react-router-dom'
import { useSession } from '@/store/SessionContext'
import { HomeScreen } from '@/pages/HomeScreen'
import type { Session } from '@/types'

export function DashboardPage() {
  const { dispatch, repository } = useSession()
  const navigate = useNavigate()

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
    navigate('/interviews')
  }

  function handleLoad(id: string) {
    const session = repository.load(id)
    if (session) {
      dispatch({ type: 'LOAD_SESSION', session })
      navigate('/interviews')
    }
  }

  return (
    <HomeScreen onNew={handleNew} onLoad={handleLoad} onNewJdMatch={() => navigate('/jobs')} />
  )
}
