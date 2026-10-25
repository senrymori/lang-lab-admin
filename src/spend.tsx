import { useEffect, useRef } from 'react'
import type { Service, SpendDay } from './api'
import { fmtDate, usd } from './format'

// what the money went to, in the order the bars stack (the tutor at the bottom: most of it)
export const SERVICES: { key: Service; label: string; who: string }[] = [
  { key: 'tutor', label: 'Репетитор', who: 'OpenAI' },
  { key: 'helper', label: 'Подсказки', who: 'OpenAI, малая модель' },
  { key: 'checks', label: 'Проверки', who: 'OpenAI: спам, уход от урока' },
  { key: 'speech', label: 'Распознавание речи', who: 'Gemini' },
]
export const serviceLabel = (k: string) => SERVICES.find((s) => s.key === k)?.label ?? k

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The services and their sums, each in its bar colour. */
export function ServiceLegend({ sums }: { sums: Partial<Record<Service, number>> }) {
  return (
    <div className="svc-legend">
      {SERVICES.map((s) => (
        <span key={s.key} className="svc">
          <i className={`svc-${s.key}`} />
          <span className="name">{s.label}</span>
          <span className="sub">{s.who}</span>
          <b>{usd(sums[s.key] ?? 0)}</b>
        </span>
      ))}
    </div>
  )
}

/** A bar a day, its services stacked; days without spend stay empty. */
export function SpendChart({ spend, today, days = 30 }: { spend: SpendDay[]; today: Date; days?: number }) {
  const byDay = new Map(spend.map((d) => [d.day.slice(0, 10), d]))
  const cols = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1 + i)
    const got = byDay.get(dayKey(d))
    return { date: d, usd: got?.usd ?? 0, calls: got?.calls ?? 0, by: got?.by_service ?? {} }
  })
  const peak = Math.max(0.01, ...cols.map((c) => c.usd))
  const now = cols[cols.length - 1]
  // on a narrow screen the chart scrolls: start at today's end
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])
  const every = days > 45 ? 10 : 5
  return (
    <div className="chart" ref={scroller}>
      <div className="bars">
        {cols.map((c, i) => (
          <div key={i} className={`bar${i === cols.length - 1 ? ' today' : ''}`}
            title={`${fmtDate(c.date)}: ${usd(c.usd)}${c.calls ? `, вызовов ${c.calls}` : ''}` +
              SERVICES.filter((s) => c.by[s.key]).map((s) => `\n${s.label}: ${usd(c.by[s.key]!)}`).join('')}>
            <span className="bar-stack" style={{ height: `${(c.usd / peak) * 100}%`, minHeight: c.usd > 0 ? 2 : 0 }}>
              {SERVICES.filter((s) => c.by[s.key]).map((s) => (
                <i key={s.key} className={`svc-${s.key}`} style={{ height: `${(c.by[s.key]! / c.usd) * 100}%` }} />
              ))}
            </span>
          </div>
        ))}
        <span className="bars-today" style={{ bottom: `calc(${(now.usd / peak) * 100}% + 12px)` }}>Сегодня {usd(now.usd)}</span>
      </div>
      <div className="days">
        {cols.map((c, i) => (
          <span key={i}>{c.date.getDate() % every === 0 || i === cols.length - 1 ? c.date.getDate() : ''}</span>
        ))}
      </div>
    </div>
  )
}
