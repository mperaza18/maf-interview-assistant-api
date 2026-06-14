import { ApiError } from './interviewApi'
import type { JobDescriptionUpload, JdAnalysisResult } from '../types'

const baseUrl = () => (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5001'

export async function uploadJobDescription(file: File): Promise<JobDescriptionUpload> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${baseUrl()}/api/job-descriptions`, {
    method: 'POST',
    body: formData,
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return JSON.parse(text) as JobDescriptionUpload
}

export async function analyzeJobDescription(id: string): Promise<JdAnalysisResult> {
  const res = await fetch(`${baseUrl()}/api/job-descriptions/${id}/analyze`, {
    method: 'POST',
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return JSON.parse(text) as JdAnalysisResult
}
