import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SubmitJobForm } from './SubmitJobForm'

vi.mock('../api/client', () => ({
  api: {
    getBranches: vi.fn().mockResolvedValue([
      { id: 'lon-1', name: 'Covert London City', city: 'London' },
    ]),
  },
}))

// Mock BranchSelector with a native <select> to avoid MUI portal complexity in tests.
vi.mock('./BranchSelector', () => ({
  BranchSelector: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <select
      aria-label="Branch location"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Select branch</option>
      <option value="lon-1">Covert London City</option>
    </select>
  ),
}))

interface XhrMock {
  open: ReturnType<typeof vi.fn>
  setRequestHeader: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  upload: { onprogress: ((e: ProgressEvent) => void) | null }
  onload: ((e: Event) => void) | null
  onerror: ((e: Event) => void) | null
  status: number
  responseText: string
}

let xhrMock: XhrMock

function setupXhrMock(
  status = 202,
  responseText = JSON.stringify({ id: 'job-123', status: 'Coordinating' }),
) {
  xhrMock = {
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    upload: { onprogress: null },
    onload: null,
    onerror: null,
    status,
    responseText,
  }
  vi.stubGlobal('XMLHttpRequest', vi.fn(() => xhrMock))
}

describe('SubmitJobForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupXhrMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the form', () => {
    render(<SubmitJobForm onSubmitted={() => {}} />)
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    expect(screen.getByText('Submit Print Job')).toBeInTheDocument()
  })

  it('shows error when submitted without a file', async () => {
    const user = userEvent.setup()
    render(<SubmitJobForm onSubmitted={() => {}} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please select a file')
  })

  it('shows error when file exceeds 50 MB', async () => {
    const user = userEvent.setup()
    render(<SubmitJobForm onSubmitted={() => {}} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File([''], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(bigFile, 'size', { value: 51 * 1024 * 1024 })
    await user.upload(fileInput, bigFile)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('50 MB')
  })

  it('shows validation error when no branch selected', async () => {
    const user = userEvent.setup()
    render(<SubmitJobForm onSubmitted={() => {}} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['content'], 'test.pdf', { type: 'application/pdf' }))

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please select a branch')
  })

  it('shows progress bar during upload', async () => {
    const user = userEvent.setup()
    render(<SubmitJobForm onSubmitted={() => {}} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['content'], 'test.pdf', { type: 'application/pdf' }))
    await user.selectOptions(screen.getByRole('combobox', { name: /branch location/i }), 'lon-1')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(xhrMock.send).toHaveBeenCalled())

    act(() => {
      xhrMock.upload.onprogress?.({
        lengthComputable: true,
        loaded: 50,
        total: 100,
      } as ProgressEvent)
    })

    expect(screen.getByRole('progressbar', { name: /upload progress/i })).toBeInTheDocument()

    act(() => { xhrMock.onload?.({} as Event) })
  })

  it('calls onSubmitted with jobId on success', async () => {
    const onSubmitted = vi.fn()
    const user = userEvent.setup()

    render(<SubmitJobForm onSubmitted={onSubmitted} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['content'], 'secret.pdf', { type: 'application/pdf' }))
    await user.selectOptions(screen.getByRole('combobox', { name: /branch location/i }), 'lon-1')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(xhrMock.send).toHaveBeenCalled())

    act(() => { xhrMock.onload?.({} as Event) })

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('job-123'))
  })
})
