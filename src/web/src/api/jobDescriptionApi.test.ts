import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadJobDescription } from './jobDescriptionApi'
import { ApiError } from './interviewApi'
import type { JobDescriptionUpload } from '../types'

const mockUpload: JobDescriptionUpload = {
  id: 'abc-123',
  fileName: 'senior-jd.pdf',
  sizeBytes: 2048,
  status: 'parsed',
  uploadedAt: '2026-06-11T12:00:00Z',
}

function mockFetch(status: number, body: unknown) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response)
}

beforeEach(() => vi.restoreAllMocks())

describe('uploadJobDescription', () => {
  it('POSTs multipart form data to /api/job-descriptions and returns parsed response', async () => {
    mockFetch(201, mockUpload)
    const file = new File(['%PDF-1.4'], 'senior-jd.pdf', { type: 'application/pdf' })

    const result = await uploadJobDescription(file)

    expect(result).toEqual(mockUpload)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/api/job-descriptions')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
  })

  it('throws ApiError with status on non-2xx response', async () => {
    mockFetch(422, { detail: 'unreadable' })
    const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' })

    await expect(uploadJobDescription(file)).rejects.toBeInstanceOf(ApiError)
  })
})
