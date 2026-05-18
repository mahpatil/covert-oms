const BASE = '/api'

const authHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const handle = async (r: Response) => {
  if (r.status === 401) {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('username')
    window.dispatchEvent(new Event('auth:expired'))
    throw new Error('Session expired. Please sign in again.')
  }
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export interface Branch {
  id: string
  name: string
  city: string
}

export interface PrintSettings {
  copies: number
  colour: boolean
  paperSize: string
}

export interface SubmitJobRequest {
  documentName: string
  branchId: string
  settings: PrintSettings
}

export interface SubmitJobResponse {
  id: string
  status: string
}

export type JobStatus = 'Pending' | 'Coordinating' | 'Printing' | 'Done' | 'Failed'

export interface PrintJob {
  id: string
  documentName: string
  branchId: string
  settings: PrintSettings
  status: JobStatus
  createdAt: string
}

export const api = {
  getBranches: (): Promise<Branch[]> =>
    fetch(`${BASE}/branches`).then(handle),

  listJobs: (): Promise<PrintJob[]> =>
    fetch(`${BASE}/orders`, { headers: authHeaders() }).then(handle),

  getJob: (id: string): Promise<PrintJob> =>
    fetch(`${BASE}/orders/${id}`, { headers: authHeaders() }).then(handle),
}
