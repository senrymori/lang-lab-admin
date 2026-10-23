import { useCallback } from 'react'
import { api } from '../api'
import { usd } from '../format'
import { useLoad } from '../useLoad'

export function Overview({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => Promise.all([api.overview(), api.spend(30)]), [])
  const { data, error } = useLoad(load, onAuthError)
  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Загружаю…</p>
  const [o, spend] = data
  const active = o.learners.active ?? 0
  const blocked = o.learners.blocked ?? 0
  const peak = Math.max(0.01, ...spend.map((d) => d.usd))
  return (
    <>
      <section className="stats">
        <Stat label="Ученики" value={`${active + blocked} из ${o.max_learners}`} note={blocked ? `заблокировано ${blocked}` : 'мест в бете'} />
        <Stat label="Сейчас на уроке" value={String(o.live_lessons)} />
        <Stat label="Расход сегодня" value={usd(o.spent_today_usd)} note={`лимит ученика ${usd(o.daily_budget_usd)} в день`} />
        <Stat label="Расход за месяц" value={usd(o.spent_month_usd)} note="модели репетитора" />
      </section>
      <section className="card">
        <h2>Расход по дням, 30 дней</h2>
        {spend.length === 0 ? (
          <p className="muted">Пока ни одного урока.</p>
        ) : (
          <div className="bars">
            {spend.map((d) => (
              <div key={d.day} className="bar" title={`${d.day}: ${usd(d.usd)}, вызовов ${d.calls}`}>
                <i style={{ height: `${(d.usd / peak) * 100}%` }} />
                <span>{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card stat">
      <div className="muted">{label}</div>
      <div className="value">{value}</div>
      {note && <div className="muted small">{note}</div>}
    </div>
  )
}
