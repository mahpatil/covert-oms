import { useEffect, useState } from 'react'
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

  if (loading) return <select disabled><option>Loading branches…</option></select>

  return (
    <select value={value} onChange={e => onChange(e.target.value)} required>
      <option value="">Select a branch</option>
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
      ))}
    </select>
  )
}
