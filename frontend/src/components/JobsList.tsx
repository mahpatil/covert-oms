import { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Button, Card, CardActionArea, CardContent,
  Chip, LinearProgress, Alert, Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import { api, PrintJob, JobStatus } from '../api/client'
import { OrderStatus } from './OrderStatus'

const STATUS_META: Record<JobStatus, { label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' }> = {
  Pending:      { label: 'Queued',       color: 'default' },
  Coordinating: { label: 'Coordinating', color: 'info' },
  Printing:     { label: 'Printing…',    color: 'warning' },
  Done:         { label: 'Printed',      color: 'success' },
  Failed:       { label: 'Failed',       color: 'error' },
}

interface Props {
  onNewJob: () => void
}

export function JobsList({ onNewJob }: Props) {
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api.listJobs()
      setJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Poll while any job is still in progress
    const id = setInterval(async () => {
      const data = await api.listJobs().catch(() => null)
      if (data) {
        setJobs(data)
        if (data.every(j => j.status === 'Done' || j.status === 'Failed')) {
          clearInterval(id)
        }
      }
    }, 3000)
    return () => clearInterval(id)
  }, [load])

  if (loading) return <LinearProgress color="secondary" />
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Print Jobs</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {jobs.length === 0 ? 'No jobs yet' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={load} variant="outlined">
            Refresh
          </Button>
          <Button size="small" startIcon={<AddIcon />} onClick={onNewJob} variant="contained" color="secondary">
            New Job
          </Button>
        </Box>
      </Box>

      {jobs.length === 0 ? (
        <Card sx={{ boxShadow: 1, textAlign: 'center', py: 6 }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>No print jobs submitted yet.</Typography>
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={onNewJob}>
            Submit your first job
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {jobs.map(job => (
            <Box key={job.id}>
              <Card
                sx={{
                  boxShadow: selectedId === job.id ? 4 : 1,
                  border: selectedId === job.id ? '2px solid' : '2px solid transparent',
                  borderColor: selectedId === job.id ? 'secondary.main' : 'transparent',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                <CardActionArea onClick={() => setSelectedId(selectedId === job.id ? null : job.id)}>
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {job.documentName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {job.settings.copies} cop{job.settings.copies !== 1 ? 'ies' : 'y'} · {job.settings.paperSize}
                          {job.settings.colour ? ' · Colour' : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={STATUS_META[job.status].label}
                        color={STATUS_META[job.status].color}
                        size="small"
                        sx={{ ml: 2, flexShrink: 0 }}
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>

                {selectedId === job.id && (
                  <>
                    <Divider />
                    <Box sx={{ p: 2 }}>
                      <OrderStatus jobId={job.id} />
                    </Box>
                  </>
                )}
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
