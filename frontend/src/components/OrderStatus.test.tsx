import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { OrderStatus } from './OrderStatus'
import * as client from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    getJob: vi.fn(),
  },
}))

const makeJob = (status: client.JobStatus) => ({
  id: 'job-1',
  documentName: 'secret.pdf',
  branchId: 'lon-1',
  settings: { copies: 1, colour: false, paperSize: 'A4' },
  status,
  createdAt: new Date().toISOString(),
})

describe('OrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows job id and document name', async () => {
    vi.mocked(client.api.getJob).mockResolvedValue(makeJob('Printing'))

    render(<OrderStatus jobId="job-1" />)

    await waitFor(() => {
      expect(screen.getByText(/job-1/i)).toBeInTheDocument()
      expect(screen.getByText(/secret\.pdf/i)).toBeInTheDocument()
    })
  })

  it('shows "Printed successfully" when status is Done', async () => {
    vi.mocked(client.api.getJob).mockResolvedValue(makeJob('Done'))

    render(<OrderStatus jobId="job-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Printed successfully/i)).toBeInTheDocument()
    })
  })

  it('shows "Print failed" when status is Failed', async () => {
    vi.mocked(client.api.getJob).mockResolvedValue(makeJob('Failed'))

    render(<OrderStatus jobId="job-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Print failed/i)).toBeInTheDocument()
    })
  })

  it('polls while job is in progress', async () => {
    vi.mocked(client.api.getJob)
      .mockResolvedValueOnce(makeJob('Printing'))
      .mockResolvedValueOnce(makeJob('Done'))

    render(<OrderStatus jobId="job-1" />)

    await waitFor(() => screen.getByText(/Printing/i))

    vi.advanceTimersByTime(2500)

    await waitFor(() => {
      expect(screen.getByText(/Printed successfully/i)).toBeInTheDocument()
    })
  })
})
