// The backend's admin API (lang-lab-backend/app/admin.py). The key is typed once and kept in this browser.
const KEY = 'langlab-admin-key'

export const getKey = () => localStorage.getItem(KEY) ?? ''
export const setKey = (k: string) => (k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY))

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/admin/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${getKey()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const detail = await r.json().then((j) => j.detail, () => r.statusText)
    throw new ApiError(r.status, typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return r.json()
}

export interface Overview {
  learners: Record<string, number>
  max_learners: number
  spent_today_usd: number
  spent_month_usd: number
  live_lessons: number
  requests: number
}

export interface Learner {
  id: string
  email: string
  name: string
  status: 'active' | 'blocked'
  code: string | null
  lessons_total: number
  lessons_used: number
  access_until: string | null
  created_at: string
  last_seen_at: string | null
  spent_today_usd: number
  spent_30d_usd: number
  spent_total_usd: number
  blocked_reason: string
  blocked_at: string | null
  live: string | null
}

export interface SpendAlert {
  id: number
  learner_id: string
  name: string
  email: string
  sid: string
  lang: string
  usd_by_window: Record<string, number>
  session_usd: number
  verdict: 'spam' | 'flag' | 'ok' | 'error' | 'care'
  reason: string
  created_at: string
}

export interface Code {
  code: string
  kind: 'invite' | 'promo'
  name: string
  email: string | null
  sent: boolean
  lessons: number
  days: number | null
  used: number
  max_uses: number
  note: string
  expires_at: string | null
  active: boolean
  created_at: string
}

export interface NewCode {
  note: string
  name: string
  email: string
  lessons: number
  days: number | null
  kind: 'invite' | 'promo'
  max_uses: number
  expires_in_days: number | null
  request?: number
}

export interface AccessRequest {
  id: number
  name: string
  email: string
  created_at: string
}

export interface SpendDay {
  day: string
  usd: number
  calls: number
}

export const api = {
  overview: () => call<Overview>('GET', '/overview'),
  learners: () => call<Learner[]>('GET', '/learners'),
  changeLearner: (id: string, change: { status?: Learner['status']; add_lessons?: number; name?: string }) =>
    call<Learner>('PATCH', `/learners/${id}`, change),
  codes: () => call<Code[]>('GET', '/codes'),
  newCode: (c: NewCode) => call<Code>('POST', '/codes', c),
  setCodeActive: (code: string, active: boolean) => call<Code>('PATCH', `/codes/${code}`, { active }),
  sendInvite: (code: string) => call<Code>('POST', `/codes/${code}/send`),
  requests: () => call<AccessRequest[]>('GET', '/requests'),
  dismissRequest: (id: number) => call<{ ok: true }>('DELETE', `/requests/${id}`),
  spend: (days = 30) => call<SpendDay[]>('GET', `/spend?days=${days}`),
  alerts: () => call<SpendAlert[]>('GET', '/alerts'),
}
