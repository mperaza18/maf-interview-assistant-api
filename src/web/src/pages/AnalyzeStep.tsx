import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { analyzeResumePdf, ApiError } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function AnalyzeStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [role, setRole] = useState(session?.role ?? 'Software Engineer')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!session) return null

  const hasResult = Boolean(session.profile && session.seniority)

  function mapError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 400) return 'Please select a valid PDF file.'
      if (err.status === 422) return "This PDF doesn't contain readable text. Try a text-based PDF."
    }
    return 'Upload failed. Please try again.'
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus('uploading')
    setErrorMessage(null)
    try {
      const result = await analyzeResumePdf(file, role)
      dispatch({
        type: 'LOAD_SESSION',
        session: {
          ...session!,
          resumeText: '',
          role,
          profile: result.profile,
          seniority: result.seniority,
          candidateName: result.profile.candidateName,
        },
      })
      setUploadStatus('success')
    } catch (err) {
      setUploadStatus('error')
      setErrorMessage(mapError(err))
    }
  }

  function handleRetry() {
    setUploadStatus('idle')
    setErrorMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Resume (PDF)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload PDF resume"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === 'uploading'}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload PDF'}
            </Button>
            {uploadStatus === 'success' && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <span>📄</span>
                <span>✓</span>
              </span>
            )}
            {uploadStatus === 'error' && (
              <span className="flex items-center gap-2 text-sm">
                <span>📄</span>
                <span className="text-red-400">✗</span>
                <button
                  onClick={handleRetry}
                  className="text-indigo-400 underline hover:text-indigo-300"
                >
                  Try another file
                </button>
              </span>
            )}
          </div>
          {uploadStatus === 'error' && errorMessage && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}
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
        </div>
      </div>

      {uploadStatus === 'uploading' && <LoadingSpinner label="Analyzing resume with AI..." />}

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
            <span className="text-slate-200">
              {Math.round(session.seniority.confidence * 100)}%
            </span>
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
