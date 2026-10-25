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

// what the money went to (the server's Spend.service)
export type Service = 'tutor' | 'helper' | 'checks' | 'speech'

export interface Overview {
  learners: Record<string, number>
  max_learners: number
  spent_today_usd: number
  spent_month_usd: number
  live_lessons: number
  paused_lessons: number
  requests: number
  services_month: Partial<Record<Service, number>>
  allowances: {
    azure_chars_month: number
    azure_chars_limit: number
    letters_today: number
    letters_day_limit: number
    letters_month: number
    letters_month_limit: number
  }
  fixed_costs: { name: string; usd_month: number | null; note?: string; until?: string | null }[]
}

export interface SpendDetail {
  total_usd: number
  by_service: Partial<Record<Service, number>>
  by_learner: { learner_id: string; name: string; email: string; usd: number; calls: number }[]
  rows: { day: string; learner_id: string; name: string; email: string; service: Service; usd: number; calls: number }[]
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
  /** the mode of a lesson going (live or paused), null when none is */
  live: string | null
  /** is the learner there: the app not connected, its window away, nothing from them for a while — a pause */
  presence: Presence | null
}

export interface Presence {
  state: 'live' | 'paused'
  why?: 'app' | 'away' | 'idle'
  idle_min?: number
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
  verdict: 'spam' | 'flag' | 'ok' | 'error' | 'care' | 'watch'
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
  by_service: Partial<Record<Service, number>>
}

// one learner in one language: their level there, the mean rating and every answer, newest first
export interface FeedbackRow {
  learner_id: string
  name: string
  email: string
  lang: string
  level: string | null
  rating: number | null
  items: {
    sid: string
    ts: string
    mode: 'learn' | 'placement'
    rating?: number
    liked?: string[]
    disliked?: string[]
    why?: string
    comment?: string
  }[]
}

export interface SpendFilter { days?: number; learner?: string; service?: Service }
const query = (f: SpendFilter) =>
  new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()

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
  spend: (f: SpendFilter = {}) => call<SpendDay[]>('GET', `/spend?${query({ days: 30, ...f })}`),
  spendDetail: (f: SpendFilter = {}) => call<SpendDetail>('GET', `/spend/detail?${query({ days: 30, ...f })}`),
  alerts: () => call<SpendAlert[]>('GET', '/alerts'),
  feedback: () => call<FeedbackRow[]>('GET', '/feedback'),
  setups: (lang = '') => call<Setups>('GET', lang ? `/setups?lang=${lang}` : '/setups'),
  languages: () => call<LanguageRow[]>('GET', '/languages'),
}

/** How learners set lessons up before they start (lp/setup.py): the counts, and their own words. */
export interface Setups {
  total: number
  how: Record<'custom' | 'lemur' | 'last', number>
  focus: { key: string; title: string; n: number }[]
  topics: { key: string; title: string; n: number }[]
  /** how many learners have each topic in their pool (the lemur links what they say to one topic) */
  pools: { key: string; title: string; n: number }[]
  own: { learner_id: string; name: string; email: string; lang: string; ts: string; what: string; text: string; topic: string }[]
}

/** A language at a glance: who took it up, lessons and placements, levels, the mean rating, the tutor's cost there. */
export interface LanguageRow {
  lang: string
  name: string
  learners: number
  lessons: number
  placements: number
  levels: Record<string, number>
  rating: number | null
  usd_30d: number
  usd_total: number
}
