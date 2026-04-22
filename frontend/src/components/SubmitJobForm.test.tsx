import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SubmitJobForm } from './SubmitJobForm'
import * as client from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    getBranches: vi.fn().mockResolvedValue([
      { id: 'lon-1', name: 'Covert London City', city: 'London' },
    ]),
    submitJob: vi.fn(),
  },
}))

describe('SubmitJobForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form', async () => {
    render(<SubmitJobForm onSubmitted={() => {}} />)
    expect(screen.getByText('Submit Print Job')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('shows error when submitted without a file', async () => {
    const user = userEvent.setup()
    render(<SubmitJobForm onSubmitted={() => {}} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please select a file')
  })

  it('shows validation error when no branch selected', async () => {
    // Branches loaded
    await screen.findByText(/London/i).catch(() => {})
    render(<SubmitJobForm onSubmitted={() => {}} />)

    const file = new File(['hello'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/document/i) as HTMLInputElement
    await userEvent.setup().upload(input, file)

    await userEvent.setup().click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please select a branch')
  })

  it('calls onSubmitted with jobId on success', async () => {
    vi.mocked(client.api.submitJob).mockResolvedValue({ id: 'job-123', status: 'Pending' })
    const onSubmitted = vi.fn()
    const user = userEvent.setup()

    render(<SubmitJobForm onSubmitted={onSubmitted} />)

    // Wait for branches to load
    await screen.findByText(/London/)

    const file = new File(['pdf content'], 'secret.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/document/i) as HTMLInputElement, file)
    await user.selectOptions(screen.getByRole('combobox', { name: /branch/i }), 'lon-1')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmitted).toHaveBeenCalledWith('job-123')
  })
})
