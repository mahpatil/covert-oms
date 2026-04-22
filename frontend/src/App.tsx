import { useState } from 'react'
import { SubmitJobForm } from './components/SubmitJobForm'
import { OrderStatus } from './components/OrderStatus'

export default function App() {
  const [jobId, setJobId] = useState<string | null>(null)

  return (
    <main style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Covert Print Service</h1>
      <p>Submit confidential documents for secure printing at your nearest branch.</p>

      {jobId ? (
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
