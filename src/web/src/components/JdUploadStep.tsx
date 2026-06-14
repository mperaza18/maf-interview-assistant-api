import { useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useJdMatch } from '@/store/JdMatchContext'
import { uploadJobDescription, analyzeJobDescription } from '@/api/jobDescriptionApi'
import { ApiError } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const MAX_SIZE_BYTES = 10 * 1024 * 1024

type UploadStatus = 'idle' | 'uploading' | 'error'
type AnalyzeStatus = 'idle' | 'analyzing' | 'error'

function validate(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Only PDF files are supported.'
  if (file.size > MAX_SIZE_BYTES) return 'File exceeds the 10 MB limit.'
  return null
}

function mapUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413) return 'File exceeds the 10 MB limit.'
    if (err.status === 422) return "This PDF doesn't contain readable text. Try a text-based PDF."
    if (err.status === 400) {
      try {
        const pd = JSON.parse(err.body) as { detail?: unknown }
        if (typeof pd.detail === 'string' && pd.detail.includes('10 MB')) return 'File exceeds the 10 MB limit.'
      } catch {
        // ignore non-JSON bodies
      }
      return 'Please select a valid PDF file.'
    }
  }
  return 'Upload failed. Please try again.'
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function JdUploadStep() {
  const { state, dispatch } = useJdMatch()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [analyzeStatus, setAnalyzeStatus] = useState<AnalyzeStatus>('idle')
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const jd = state.jobDescription

  async function handleFile(file: File) {
    const validationError = validate(file)
    if (validationError) {
      setStatus('error')
      setErrorMessage(validationError)
      return
    }

    setStatus('uploading')
    setErrorMessage(null)
    try {
      const result = await uploadJobDescription(file)
      dispatch({ type: 'SET_JOB_DESCRIPTION', jobDescription: result })
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(mapUploadError(err))
    }
  }

  async function handleAnalyze() {
    if (!jd) return
    setAnalyzeStatus('analyzing')
    setAnalyzeError(null)
    try {
      const result = await analyzeJobDescription(jd.id)
      dispatch({ type: 'SET_ANALYSIS', analysisResult: result })
    } catch {
      setAnalyzeStatus('error')
      setAnalyzeError('Analysis failed. Please try again.')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors',
          isDragging ? 'border-indigo-400 bg-indigo-500/5' : 'border-indigo-500/40 bg-card/50',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload JD PDF"
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20">
          <Upload className="text-indigo-400" size={22} />
        </div>
        <p className="font-semibold text-foreground">Drag &amp; drop your JD PDF here</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF up to 10 MB — or browse to select a file</p>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={status === 'uploading'}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          Browse files
        </Button>
        {status === 'error' && errorMessage && (
          <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
        )}
      </div>

      {status === 'uploading' && <LoadingSpinner label="Uploading and parsing JD..." />}

      {jd && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recently Uploaded
          </p>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-500/20">
              <FileText className="text-indigo-400" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{jd.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(jd.sizeBytes)} · Uploaded {new Date(jd.uploadedAt).toLocaleString()}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              ✓ Parsed
            </span>
            <Button
              onClick={() => void handleAnalyze()}
              disabled={analyzeStatus === 'analyzing'}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {analyzeStatus === 'analyzing' ? 'Analyzing JD…' : 'Analyze JD →'}
            </Button>
          </div>
          {analyzeStatus === 'error' && analyzeError && (
            <p className="text-sm text-red-400">{analyzeError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            SmartFitter will extract required skills, seniority and a JD quality score in the next step.
          </p>
        </div>
      )}
    </div>
  )
}
