const BASE = '/api'

const authHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
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
  documentBase64: string
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
    fetch(`${BASE}/branches`).then(r => r.json()),

  submitJob: (req: SubmitJobRequest): Promise<SubmitJobResponse> =>
    fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(req),
    }).then(async r => {
      if (!r.ok) throw new Error(await r.text())
      return r.json()
    }),

  getJob: (id: string): Promise<PrintJob> =>
    fetch(`${BASE}/orders/${id}`, { headers: authHeaders() }).then(r => r.json()),
}
