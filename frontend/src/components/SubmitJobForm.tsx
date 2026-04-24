import { FormEvent, useRef, useState } from 'react'
import {
  Box, Card, CardContent, Typography, Button, TextField,
  FormControlLabel, Checkbox, Select, MenuItem, FormControl,
  InputLabel, Divider, Alert, CircularProgress, Chip,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import PrintIcon from '@mui/icons-material/Print'
import { api, PrintSettings } from '../api/client'
import { BranchSelector } from './BranchSelector'

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
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0]
    setFileName(file?.name ?? null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a document.'); return }
    if (!branchId) { setError('Please select a branch.'); return }

    const buffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

    setSubmitting(true)
    try {
      const result = await api.submitJob({
        documentName: file.name,
        branchId,
        documentBase64: base64,
        settings,
      })
      onSubmitted(result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
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
