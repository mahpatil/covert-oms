import { FormEvent, useRef, useState } from 'react'
import {
  Box, Card, CardContent, Typography, Button, TextField,
  FormControlLabel, Checkbox, Select, MenuItem, FormControl,
  InputLabel, Divider, Alert, CircularProgress, Chip, LinearProgress,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import PrintIcon from '@mui/icons-material/Print'
import { PrintSettings } from '../api/client'
import { BranchSelector } from './BranchSelector'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

function uploadFormData(
  formData: FormData,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = sessionStorage.getItem('access_token')
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/orders')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 202 || xhr.status === 200) {
        try {
          resolve(JSON.parse(xhr.responseText).id)
        } catch {
          reject(new Error('Invalid server response'))
        }
      } else if (xhr.status === 401) {
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('username')
        window.dispatchEvent(new Event('auth:expired'))
        reject(new Error('Session expired. Please sign in again.'))
      } else {
        reject(new Error(xhr.responseText || 'Submission failed'))
      }
    }

    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })
}

interface Props {
  onSubmitted: (jobId: string) => void
}

export function SubmitJobForm({ onSubmitted }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [branchId, setBranchId] = useState('')
  const [settings, setSettings] = useState<PrintSettings>({
    copies: 1,
    colour: false,
    paperSize: 'A4',
  })
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0]
    setFileName(file?.name ?? null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a file.'); return }
    if (file.size > MAX_FILE_SIZE) { setError('File exceeds the 50 MB limit.'); return }
    if (!branchId) { setError('Please select a branch.'); return }

    const formData = new FormData()
    formData.append('documentName', file.name)
    formData.append('branchId', branchId)
    formData.append('settings.Copies', settings.copies.toString())
    formData.append('settings.Colour', settings.colour.toString())
    formData.append('settings.PaperSize', settings.paperSize)
    formData.append('document', file)

    setSubmitting(true)
    setProgress(0)
    try {
      const jobId = await uploadFormData(formData, setProgress)
      onSubmitted(jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
      setProgress(0)
    }
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', px: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>New Print Job</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Your document is encrypted in transit and destroyed after printing.
      </Typography>

      <Card sx={{ boxShadow: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>

            {/* Document upload */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Document</Typography>
            <Box
              onClick={() => fileRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: fileName ? 'secondary.main' : 'grey.300',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                mb: 3,
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: 'secondary.main' },
              }}
            >
              <UploadFileIcon sx={{ fontSize: 36, color: fileName ? 'secondary.main' : 'grey.400', mb: 1 }} />
              {fileName ? (
                <Chip label={fileName} color="secondary" size="small" />
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Click to upload — PDF or image
                </Typography>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </Box>

            {/* Branch */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Print Location</Typography>
            <Box sx={{ mb: 3 }}>
              <BranchSelector value={branchId} onChange={setBranchId} />
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Print settings */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Print Settings</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Copies"
                type="number"
                size="small"
                value={settings.copies}
                onChange={e => setSettings(s => ({ ...s, copies: Number(e.target.value) }))}
                slotProps={{ htmlInput: { min: 1, max: 99 } }}
                sx={{ width: 100 }}
              />
              <FormControl size="small" sx={{ width: 120 }}>
                <InputLabel>Paper size</InputLabel>
                <Select
                  value={settings.paperSize}
                  label="Paper size"
                  onChange={e => setSettings(s => ({ ...s, paperSize: e.target.value }))}
                >
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="A3">A3</MenuItem>
                  <MenuItem value="Letter">Letter</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.colour}
                    onChange={e => setSettings(s => ({ ...s, colour: e.target.checked }))}
                    color="secondary"
                  />
                }
                label="Colour"
                sx={{ ml: 0 }}
              />
            </Box>

            {progress > 0 && progress < 100 && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  color="secondary"
                  aria-label="Upload progress"
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Uploading… {progress}%
                </Typography>
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <PrintIcon />}
            >
              {submitting ? 'Submitting…' : 'Submit Print Job'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
