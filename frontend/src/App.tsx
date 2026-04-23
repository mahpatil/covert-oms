import { useState } from 'react'
import { LoginForm } from './components/LoginForm'
import { SubmitJobForm } from './components/SubmitJobForm'
import { OrderStatus } from './components/OrderStatus'

export default function App() {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem('access_token')
  )
  const [username, setUsername] = useState<string | null>(
    () => sessionStorage.getItem('username')
  )
  const [jobId, setJobId] = useState<string | null>(null)

  const handleLogin = (t: string, u: string) => {
    setToken(t)
    setUsername(u)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('username')
    setToken(null)
    setUsername(null)
    setJobId(null)
  }

  const styles = {
    container: { maxWidth: 600, margin: '2rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  } as const

  return (
    <main style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Covert Print Service</h1>
        {token && (
          <span>
            <small style={{ color: '#666' }}>{username}</small>{' '}
            <button onClick={handleLogout} style={{ marginLeft: '0.5rem' }}>Sign out</button>
          </span>
        )}
      </div>
      <p>Submit confidential documents for secure printing at your nearest branch.</p>

      {!token ? (
        <LoginForm onLogin={handleLogin} />
      ) : jobId ? (
        <>
          <OrderStatus jobId={jobId} />
          <button onClick={() => setJobId(null)} style={{ marginTop: '1rem' }}>
            Submit another job
          </button>
        </>
      ) : (
        <SubmitJobForm onSubmitted={setJobId} />
      )}
    </main>
  )
}
