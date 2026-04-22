import { FormEvent, useRef, useState } from 'react'
import { api, PrintSettings } from '../api/client'
import { BranchSelector } from './BranchSelector'

interface Props {
  onSubmitted: (jobId: string) => void
}

export function SubmitJobForm({ onSubmitted }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [branchId, setBranchId] = useState('')
  const [settings, setSettings] = useState<PrintSettings>({
    copies: 1,
    colour: false,
    paperSize: 'A4',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a file.'); return }
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
    <form onSubmit={handleSubmit}>
      <h2>Submit Print Job</h2>

      <label>
        Document
        <input ref={fileRef} type="file" accept="application/pdf,image/*" required />
      </label>

      <label>
        Branch
        <BranchSelector value={branchId} onChange={setBranchId} />
      </label>

      <label>
        Copies
        <input
          type="number"
          min={1}
          max={99}
          value={settings.copies}
          onChange={e => setSettings(s => ({ ...s, copies: Number(e.target.value) }))}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.colour}
          onChange={e => setSettings(s => ({ ...s, colour: e.target.checked }))}
        />
        Colour printing
      </label>

      <label>
        Paper size
        <select
          value={settings.paperSize}
          onChange={e => setSettings(s => ({ ...s, paperSize: e.target.value }))}
        >
          <option>A4</option>
          <option>A3</option>
          <option>Letter</option>
        </select>
      </label>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Print Job'}
      </button>
    </form>
  )
}
