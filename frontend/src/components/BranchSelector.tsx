import { useEffect, useState } from 'react'
import {
  FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Box, Typography,
} from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { api, Branch } from '../api/client'

interface Props {
  value: string
  onChange: (branchId: string) => void
}

export function BranchSelector({ value, onChange }: Props) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getBranches()
      .then(setBranches)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading branches…</Typography>
      </Box>
    )
  }

  return (
    <FormControl fullWidth size="small" required>
      <InputLabel>Branch location</InputLabel>
      <Select
        value={value}
        label="Branch location"
        onChange={e => onChange(e.target.value)}
        renderValue={v => {
          const b = branches.find(x => x.id === v)
          return b ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon fontSize="small" color="action" />
              {b.name}
            </Box>
          ) : ''
        }}
      >
        {branches.map(b => (
          <MenuItem key={b.id} value={b.id}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{b.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{b.city}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
