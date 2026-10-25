import { useCallback } from 'react'
import { type Overview as OverviewData, api } from '../api'
import lemur from '../assets/lemur-magnifier.webp'
import { fmtDateTime, fmtDayFull, plural, usd } from '../format'
import { ServiceLegend, SpendChart } from '../spend'
import { useLoad } from '../useLoad'

const MODE: Record<string, string> = { learn: 'урок', placement: 'определение уровня' }
const VERDICT: Record<string, string> = { spam: 'Спам — заблокирован', flag: 'Красный флаг — не заблокирован', ok: 'Похоже на урок',
  error: 'Не проверено', care: 'Возможно, человеку плохо — не заблокирован', watch: 'Непонятная активность — не флаг' }
// what the learner wrote or said, flagged by moderation: the same verdicts, read for a message
const VERDICT_MSG: Record<string, string> = { ...VERDICT, spam: 'Заблокирован — повторялось' }
const WEEK = 7 * 24 * 3600 * 1000

export function Overview({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => Promise.all([api.overview(), api.spend(), api.alerts(), api.learners()]), [])
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
            <span className="note">OpenAI и Gemini, без постоянных</span>
          </div>
        </div>,
      )}

      <section className="band body ov-body ll-grain" data-theme="light">
        <div className="wrap">
          <div className="ov-section">
            <div className="ov-section-head">
              <h2>Расход по дням</h2>
              <span className="credit">30 дней · <a className="more-link" href="#spend">Подробнее →</a></span>
            </div>
            {spend.length === 0 ? <p className="quiet">Пока ни одного урока.</p> : <SpendChart spend={spend} today={today} />}
            <ServiceLegend sums={o.services_month} />
            <p className="legend-note">Суммы — за этот месяц.</p>
          </div>

          <Allowances a={o.allowances} />
          <FixedCosts costs={o.fixed_costs} />

          <div className="ov-section">
            <div className="ov-section-head">
              <h2>Подозрительное</h2>
              <span className="credit">{lastWeek > 0 && <span className="dot" />}{lastWeek} за неделю</span>
            </div>
            {alerts.length === 0 ? (
              <p className="quiet">Ни один урок не тратил слишком быстро, ученики не писали недопустимого.</p>
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
                        {a.sid === 'burst' ? (  // speech asked for faster than a person speaks: no spend window, a pace
                          <td>Частые запросы<div className="sub">распознавание речи</div></td>
                        ) : a.sid === 'moderation' ? (  // what they wrote or said: the words are in the reason
                          <td>Модерация<div className="sub">сообщение ученика</div></td>
                        ) : a.sid === 'drift' ? (  // a cheap model read the lesson every few messages of the learner's own
                          <td>Уход от урока<div className="sub">проверка урока</div></td>
                        ) : (
                          <td>
                            {Object.entries(a.usd_by_window).map(([m, v]) => `${usd(v)} за ${m} мин`).join(', ')}
                            <div className="sub">урок всего {usd(a.session_usd)}</div>
                          </td>
                        )}
                        <td><div className="name">{(a.sid === 'moderation' || a.sid === 'drift' ? VERDICT_MSG : VERDICT)[a.verdict] ?? a.verdict}</div>{a.reason && <div className="sub">{a.reason}</div>}</td>
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

/** Free allowances: they cost nothing until they run out, and then something gets worse (Azure's voices fall back to
 * the local ones) or stops (Resend's letters). */
function Allowances({ a }: { a: OverviewData['allowances'] }) {
  const n = (x: number) => x.toLocaleString('ru-RU')
  const rows = [
    { name: 'Голоса Azure', sub: 'символов за месяц; сверх лимита лемур говорит местными голосами', used: a.azure_chars_month, limit: a.azure_chars_limit },
    { name: 'Письма Resend', sub: 'за сегодня', used: a.letters_today, limit: a.letters_day_limit },
    { name: 'Письма Resend', sub: 'за месяц', used: a.letters_month, limit: a.letters_month_limit },
  ]
  return (
    <div className="ov-section">
      <div className="ov-section-head"><h2>Бесплатные лимиты</h2></div>
      <div className="allow">
        {rows.map((r, i) => {
          const share = Math.min(1, r.used / Math.max(1, r.limit))
          return (
            <div key={i} className={`allow-row${share >= 0.8 ? ' hot' : ''}`}>
              <div><div className="name">{r.name}</div><div className="sub">{r.sub}</div></div>
              <div className="meter" role="img" aria-label={`${n(r.used)} из ${n(r.limit)}`}><i style={{ width: `${share * 100}%` }} /></div>
              <div className="num">{n(r.used)} <span className="sub">из {n(r.limit)}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** What Language Lab costs every month whatever the lessons: a reminder, not part of the spend above. */
function FixedCosts({ costs }: { costs: OverviewData['fixed_costs'] }) {
  const known = costs.filter((c) => c.usd_month != null).reduce((s, c) => s + (c.usd_month ?? 0), 0)
  return (
    <div className="ov-section">
      <div className="ov-section-head">
        <h2>Постоянные расходы</h2>
        <span className="credit">{usd(known)} в месяц · в расход выше не входят</span>
      </div>
      <table className="adm-table ov-table">
        <tbody>
          {costs.map((c) => (
            <tr key={c.name}>
              <td><div className="name">{c.name}</div>{c.note && <div className="sub">{c.note}</div>}</td>
              <td className="num">{c.usd_month != null ? `${usd(c.usd_month)} / мес` : <span className="sub">сумма не указана</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
