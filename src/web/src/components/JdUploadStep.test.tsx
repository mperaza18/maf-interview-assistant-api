import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JdUploadStep } from './JdUploadStep'
import { JdMatchProvider } from '@/store/JdMatchContext'
import { ApiError } from '@/api/interviewApi'
import * as api from '@/api/jobDescriptionApi'
import type { JobDescriptionUpload } from '@/types'

vi.mock('@/api/jobDescriptionApi')

const mockUpload: JobDescriptionUpload = {
  id: 'abc-123',
  fileName: 'senior-jd.pdf',
  sizeBytes: 253952, // 248 KB
  status: 'parsed',
  uploadedAt: '2026-06-11T12:00:00Z',
}

function renderStep() {
  return render(
    <JdMatchProvider>
      <JdUploadStep />
    </JdMatchProvider>,
  )
}

function selectFile(file: File) {
  const input = screen.getByLabelText('Upload JD PDF', { selector: 'input' })
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('JdUploadStep', () => {
  it('renders the dropzone with browse button and size hint', () => {
    renderStep()
    expect(screen.getByText('Drag & drop your JD PDF here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeInTheDocument()
    expect(screen.getByText(/PDF up to 10 MB/)).toBeInTheDocument()
  })

  it('rejects a non-PDF file without calling the API', () => {
    renderStep()
    selectFile(new File(['hello'], 'notes.txt', { type: 'text/plain' }))

    expect(screen.getByText('Only PDF files are supported.')).toBeInTheDocument()
    expect(api.uploadJobDescription).not.toHaveBeenCalled()
  })

  it('rejects a PDF over 10 MB without calling the API', () => {
    renderStep()
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })
    selectFile(big)

    expect(screen.getByText('File exceeds the 10 MB limit.')).toBeInTheDocument()
    expect(api.uploadJobDescription).not.toHaveBeenCalled()
  })

  it('uploads a valid PDF and shows the parsed card with name, size, badge, and disabled CTA', async () => {
    vi.mocked(api.uploadJobDescription).mockResolvedValueOnce(mockUpload)
    renderStep()
    selectFile(new File(['%PDF-1.4'], 'senior-jd.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(screen.getByText('senior-jd.pdf')).toBeInTheDocument())
    expect(screen.getByText(/248 KB/)).toBeInTheDocument()
    expect(screen.getByText(/Parsed/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Analyze JD/ })).toBeDisabled()
  })

  it('shows the 422 message when the PDF has no readable text', async () => {
    vi.mocked(api.uploadJobDescription).mockRejectedValueOnce(new ApiError(422, 'unreadable'))
    renderStep()
    selectFile(new File(['%PDF-1.4'], 'scan.pdf', { type: 'application/pdf' }))

    await waitFor(() =>
      expect(
        screen.getByText("This PDF doesn't contain readable text. Try a text-based PDF."),
      ).toBeInTheDocument(),
    )
  })

  it('shows a generic message on server error', async () => {
    vi.mocked(api.uploadJobDescription).mockRejectedValueOnce(new ApiError(500, 'boom'))
    renderStep()
    selectFile(new File(['%PDF-1.4'], 'jd.pdf', { type: 'application/pdf' }))

    await waitFor(() =>
      expect(screen.getByText('Upload failed. Please try again.')).toBeInTheDocument(),
    )
  })
})
