import { FormEvent, useState } from 'react'

interface Props {
  onLogin: (token: string, username: string) => void
}

export function LoginForm({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        setError('Login failed. Please try again.')
        return
      }

      const data = await res.json()
      sessionStorage.setItem('access_token', data.accessToken)
      sessionStorage.setItem('username', data.username)
      onLogin(data.accessToken, data.username)
    } catch {
      setError('Could not reach the auth service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360 }}>
      <h2>Sign In</h2>
      <p style={{ color: '#666', fontSize: '0.9em' }}>
        Demo: enter any username and password to continue.
      </p>

      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Username
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          autoFocus
          style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Password
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
        />
      </label>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
