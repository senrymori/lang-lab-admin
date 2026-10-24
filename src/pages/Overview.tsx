import { useCallback, useEffect, useRef } from 'react'
import { type SpendDay, api } from '../api'
import lemur from '../assets/lemur-magnifier.webp'
import { fmtDate, fmtDateTime, fmtDayFull, plural, usd } from '../format'
import { useLoad } from '../useLoad'

const MODE: Record<string, string> = { learn: 'урок', placement: 'определение уровня' }
const VERDICT = { spam: 'Спам — заблокирован', ok: 'Похоже на урок', error: 'Не проверено' }
const WEEK = 7 * 24 * 3600 * 1000

export function Overview({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => Promise.all([api.overview(), api.spend(30), api.alerts(), api.learners()]), [])
  const { data, error } = useLoad(load, onAuthError)
  const today = new Date()

  const head = (stats?: React.ReactNode) => (
    <section className="band ov-head ll-grain" data-theme="dark">
      <img className="ov-lemur" src={lemur} alt="Лемур с лупой изучает стену заметок" />
      <div className="wrap">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="credit">Журнал · {fmtDayFull(today)}</span>
          <h1>Обзор</h1>
        </div>
        {stats}
      </div>
    </section>
  )
  if (!data) {
    return (
      <>
        {head()}
        <section className="band body ll-grain" data-theme="light">
          <div className="wrap">{error ? <p className="error">{error}</p> : <p className="quiet">Загружаю…</p>}</div>
        </section>
      </>
    )
  }

  const [o, spend, alerts, learners] = data
  const blocked = o.learners.blocked ?? 0
  const taken = Object.values(o.learners).reduce((a, n) => a + n, 0)
  const live = learners.filter((l) => l.live)
  const lastWeek = alerts.filter((a) => today.getTime() - new Date(a.created_at).getTime() < WEEK).length

  return (
    <>
      {head(
        <div className="stats">
          <div className="stat">
            <span className="credit">Ученики</span>
            <span className="value">{taken} <small>из {o.max_learners}</small></span>
            {o.max_learners <= 40 && (
              <div className="seats" role="img" aria-label={`Занято ${taken} ${plural(taken, ['место', 'места', 'мест'])} из ${o.max_learners}`}>
                {Array.from({ length: o.max_learners }, (_, i) => <i key={i} className={i < taken ? 'on' : ''} />)}
              </div>
            )}
            {blocked > 0 && <span className="note">{plural(blocked, ['заблокирован', 'заблокировано', 'заблокировано'])} {blocked}</span>}
          </div>
          <div className="stat">
            <span className="credit">Сейчас на уроке</span>
            <span className="value">{o.live_lessons} {o.live_lessons > 0 && <span className="dot" />}</span>
            {live.length > 0 && (
              <span className="note">{live.map((l) => `${l.name || l.email} — ${MODE[l.live!] ?? l.live}`).join(', ')}</span>
            )}
          </div>
          <div className="stat">
            <span className="credit">Расход сегодня</span>
            <span className="value">{usd(o.spent_today_usd)}</span>
          </div>
          <div className="stat">
            <span className="credit">Расход за месяц</span>
            <span className="value">{usd(o.spent_month_usd)}</span>
            <span className="note">модели репетитора</span>
          </div>
        </div>,
      )}

      <section className="band body ov-body ll-grain" data-theme="light">
        <div className="wrap">
          <div className="ov-section">
            <SpendChart spend={spend} today={today} />
          </div>

          <div className="ov-section">
            <div className="ov-section-head">
              <h2>Подозрительный расход</h2>
              <span className="credit">{lastWeek > 0 && <span className="dot" />}{lastWeek} за неделю</span>
            </div>
            {alerts.length === 0 ? (
              <p className="quiet">Ни один урок не тратил слишком быстро.</p>
            ) : (
              <div className="table-wrap">
                <table className="adm-table ov-table" style={{ minWidth: 720 }}>
                  <thead>
                    <tr><th>Когда</th><th>Ученик</th><th>Расход</th><th>Решение</th></tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a.id}>
                        <td style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{fmtDateTime(a.created_at)}</td>
                        <td><div className="name">{a.name || '—'}</div><div className="sub">{a.email}</div></td>
                        <td>
                          {Object.entries(a.usd_by_window).map(([m, v]) => `${usd(v)} за ${m} мин`).join(', ')}
                          <div className="sub">урок всего {usd(a.session_usd)}</div>
                        </td>
                        <td><div className="name">{VERDICT[a.verdict]}</div>{a.reason && <div className="sub">{a.reason}</div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 30 bars, a day each — days without a lesson stay empty, today is the amber one. */
function SpendChart({ spend, today }: { spend: SpendDay[]; today: Date }) {
  const byDay = new Map(spend.map((d) => [d.day.slice(0, 10), d]))
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29 + i)
    const got = byDay.get(dayKey(d))
    return { date: d, usd: got?.usd ?? 0, calls: got?.calls ?? 0 }
  })
  const top = days.reduce((a, d) => (d.usd > a.usd ? d : a), days[0])
  const peak = Math.max(0.01, top.usd)
  const now = days[days.length - 1]
  // on a narrow screen the chart scrolls: start at today's end
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])
  return (
    <>
      <div className="ov-section-head">
        <h2>Расход по дням</h2>
        <span className="credit">30 дней{top.usd > 0 && ` · пик ${usd(top.usd)} · ${fmtDate(top.date)}`}</span>
      </div>
      {spend.length === 0 ? (
        <p className="quiet">Пока ни одного урока.</p>
      ) : (
        <div className="chart" ref={scroller}>
          <div className="bars">
            {days.map((d, i) => (
              <div key={i} className={`bar${i === days.length - 1 ? ' today' : ''}`}
                title={`${fmtDate(d.date)}: ${usd(d.usd)}${d.calls ? `, вызовов ${d.calls}` : ''}`}>
                <i style={{ height: `${(d.usd / peak) * 100}%`, minHeight: d.usd > 0 ? 2 : 0 }} />
              </div>
            ))}
            <span className="bars-today" style={{ bottom: `calc(${(now.usd / peak) * 100}% + 12px)` }}>Сегодня {usd(now.usd)}</span>
          </div>
          <div className="days">
            {days.map((d, i) => (
              <span key={i}>{d.date.getDate() % 5 === 0 || i === days.length - 1 ? d.date.getDate() : ''}</span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
