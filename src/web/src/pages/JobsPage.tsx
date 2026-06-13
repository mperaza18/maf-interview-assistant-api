import { JdMatchProvider } from '@/store/JdMatchContext'
import { JdMatchFlow } from '@/pages/JdMatchFlow'

export function JobsPage() {
  return (
    <JdMatchProvider>
      <JdMatchFlow />
    </JdMatchProvider>
  )
}
