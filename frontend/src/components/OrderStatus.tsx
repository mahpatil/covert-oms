import { useEffect, useState } from 'react'
import {
  Box, Card, CardContent, Typography, Chip, LinearProgress,
  Stepper, Step, StepLabel, Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { api, PrintJob, JobStatus } from '../api/client'

interface Props {
  jobId: string
}

const STEPS: JobStatus[] = ['Pending', 'Coordinating', 'Printing', 'Done']

const STATUS_META: Record<JobStatus, { label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' }> = {
  Pending:      { label: 'Queued',           color: 'default' },
  Coordinating: { label: 'Coordinating',     color: 'info' },
  Printing:     { label: 'Printing…',        color: 'warning' },
  Done:         { label: 'Printed',          color: 'success' },
  Failed:       { label: 'Failed',           color: 'error' },
}

export function OrderStatus({ jobId }: Props) {
  const [job, setJob] = useState<PrintJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const j = await api.getJob(jobId)
        if (cancelled) return
        setJob(j)
        if (j.status !== 'Done' && j.status !== 'Failed') {
          setTimeout(poll, 2000)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch job status')
      }
    }

    poll()
    return () => { cancelled = true }
  }, [jobId])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!job) return <LinearProgress color="secondary" />

  const activeStep = STEPS.indexOf(job.status === 'Failed' ? 'Done' : job.status)
  const meta = STATUS_META[job.status]
  const isDone = job.status === 'Done'
  const isFailed = job.status === 'Failed'
  const inProgress = !isDone && !isFailed

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardContent sx={{ p: 3 }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Job Tracking</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>ID: {job.id}</Typography>
          </Box>
          <Chip
            label={meta.label}
            color={meta.color}
            icon={isDone ? <CheckCircleIcon /> : isFailed ? <ErrorIcon /> : undefined}
            size="small"
          />
        </Box>

        {inProgress && <LinearProgress color="secondary" sx={{ mb: 3, borderRadius: 1 }} />}

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map(step => (
            <Step key={step} completed={STEPS.indexOf(step) < activeStep || isDone}>
              <StepLabel>{STATUS_META[step].label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Document</Typography>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>{job.documentName}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Copies</Typography>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>{job.settings.copies}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Paper</Typography>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>{job.settings.paperSize}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Colour</Typography>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>{job.settings.colour ? 'Yes' : 'No'}</Typography>
          </Box>
        </Box>

        {isDone && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Your document has been printed and all copies have been securely destroyed.
          </Alert>
        )}
        {isFailed && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Print failed. Please try submitting again.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
