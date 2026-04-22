import { useEffect, useState } from 'react'
import { api, PrintJob } from '../api/client'

interface Props {
  jobId: string
}

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending',
  Coordinating: 'Coordinating with branch…',
  Printing: 'Printing…',
  Done: 'Printed successfully',
  Failed: 'Print failed',
}

export function OrderStatus({ jobId }: Props) {
  const [job, setJob] = useState<PrintJob | null>(null)

  useEffect(() => {
    const poll = async () => {
      const j = await api.getJob(jobId)
      setJob(j)
      if (j.status !== 'Done' && j.status !== 'Failed') {
        setTimeout(poll, 2000)
      }
    }
    poll()
  }, [jobId])

  if (!job) return <p>Loading job status…</p>

  return (
    <div className="order-status" data-status={job.status}>
      <p><strong>Job ID:</strong> {job.id}</p>
      <p><strong>Document:</strong> {job.documentName}</p>
      <p><strong>Status:</strong> {STATUS_LABELS[job.status] ?? job.status}</p>
    </div>
  )
}
