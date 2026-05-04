import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { analyzeResume } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'

export function AnalyzeStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [resumeText, setResumeText] = useState(session?.resumeText ?? '')
  const [role, setRole] = useState(session?.role ?? 'Software Engineer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session) return null

  const hasResult = Boolean(session.profile && session.seniority)

  async function handleAnalyze() {
    if (!resumeText.trim() || !session) return
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeResume(resumeText, role)
      dispatch({
        type: 'LOAD_SESSION',
        session: {
          ...session,
          resumeText,
          role,
          profile: result.profile,
          seniority: result.seniority,
          candidateName: result.profile.candidateName,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Resume Text
          </label>
          <Textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste the candidate's plain-text resume here..."
            className="h-52 resize-none border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Target Role
          </label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-slate-700 bg-slate-800 text-slate-100"
          />
          <Button
            onClick={handleAnalyze}
            disabled={!resumeText.trim() || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </Button>
        </div>
      </div>

      {loading && <LoadingSpinner label="Analyzing resume with AI..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {hasResult && session.profile && session.seniority && (
        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-slate-800 p-4">
          <div className="text-sm font-semibold text-emerald-400">✓ Analysis Complete</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-100">{session.profile.candidateName}</span>
            {session.profile.currentTitle && (
              <span className="text-slate-400">· {session.profile.currentTitle}</span>
            )}
            {session.profile.yearsExperience != null && (
              <span className="text-slate-400">· {session.profile.yearsExperience} yrs exp</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {session.profile.coreSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="text-sm text-slate-400">
            Seniority:{' '}
            <span className="font-semibold text-indigo-400">{session.seniority.level}</span>
            {' · '}
            Confidence:{' '}
            <span className="text-slate-200">{Math.round(session.seniority.confidence * 100)}%</span>
          </div>
          {session.profile.redFlags.length > 0 && (
            <div className="text-sm text-amber-400">
              ⚠ Red flags: {session.profile.redFlags.join(', ')}
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button
              onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Next: Interview Plan →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
