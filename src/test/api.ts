import { vi } from 'vitest'

type Handler = (body: unknown) => [number, unknown] | unknown
/** The admin API for a test: 'METHOD /path' → a reply (or [status, body]). Every request is recorded. */
export function serve(routes: Record<string, Handler | unknown>) {
  const calls: { method: string; path: string; body: unknown; auth: string | null }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const path = url.replace('/admin/api', '')
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, path, body, auth: new Headers(init.headers).get('authorization') })
    const route = routes[`${method} ${path}`]
    if (route === undefined) throw new Error(`no route for ${method} ${path}`)
    const out = typeof route === 'function' ? (route as Handler)(body) : route
    const [status, data] = Array.isArray(out) && typeof out[0] === 'number' ? out as [number, unknown] : [200, out]
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  }))
  return calls
}

export const learner = (over = {}) => ({
  id: 'u1', email: 'a@example.com', name: 'Аня', status: 'active', code: 'LAB-AAAA-BBBB', lessons_total: 12,
  lessons_used: 3, access_until: null, created_at: '2026-10-20T10:00:00Z', last_seen_at: '2026-10-23T10:00:00Z',
  spent_today_usd: 0.4, spent_30d_usd: 2.5, spent_total_usd: 2.5, blocked_reason: '', blocked_at: null, live: null, presence: null, ...over,
})

export const overview = { learners: { active: 2, blocked: 1 }, max_learners: 10, spent_today_usd: 1.25,
  spent_month_usd: 14, live_lessons: 1, paused_lessons: 0, requests: 0, services_month: { tutor: 12, speech: 2 },
  allowances: { azure_chars_month: 120000, azure_chars_limit: 500000, letters_today: 3, letters_day_limit: 100,
    letters_month: 40, letters_month_limit: 3000 },
  fixed_costs: [{ name: 'VPS OVHcloud', usd_month: null, note: 'сервер' }, { name: 'Apple Developer Program', usd_month: 8.25 }] }
