import { useCallback, useState } from 'react'
import { type Service, type SpendFilter, api } from '../api'
import { fmtDate, usd, usdFine } from '../format'
import { SERVICES, ServiceLegend, SpendChart, serviceLabel } from '../spend'
import { useLoad } from '../useLoad'

const PERIODS = [7, 30, 90] as const

/** All the spend behind the overview's chart, filtered by period, learner and service (OpenAI and Gemini; the free
 * allowances and the fixed costs are on the overview). */
export function Spend({ onAuthError }: { onAuthError: () => void }) {
  const [days, setDays] = useState<number>(30)
  const [learner, setLearner] = useState('')
  const [service, setService] = useState<Service | ''>('')
  const filter: SpendFilter = { days, learner: learner || undefined, service: service || undefined }
  const load = useCallback(
    () => Promise.all([api.spend(filter), api.spendDetail(filter), api.learners()]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, learner, service],
  )
  const { data, error } = useLoad(load, onAuthError)
  const today = new Date()
  const [chart, detail, learners] = data ?? [null, null, null]

  return (
    <>
      <section className="band ll-grain" data-theme="dark">
        <div className="wrap page-head">
          <h1>Расходы</h1>
          <div className="sub-line">
            <span>{detail ? `${usd(detail.total_usd)} за ${days} дней` : ' '}</span>
            <span>OpenAI и Gemini; лимиты и постоянные — на <a href="#overview">обзоре</a></span>
          </div>
        </div>
      </section>
      <section className="band body ll-grain" data-theme="light">
        <div className="wrap spend-page">
          <div className="filters">
            <div className="seg" role="group" aria-label="Период">
              {PERIODS.map((p) => (
                <button key={p} type="button" className={p === days ? 'on' : ''} onClick={() => setDays(p)}>{p} дней</button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Сервис">
              <button type="button" className={service === '' ? 'on' : ''} onClick={() => setService('')}>Все</button>
              {SERVICES.map((s) => (
                <button key={s.key} type="button" className={service === s.key ? 'on' : ''} onClick={() => setService(s.key)}>{s.label}</button>
              ))}
            </div>
            <label className="pick">
              <span className="sr">Ученик</span>
              <select className="field" value={learner} onChange={(e) => setLearner(e.target.value)}>
                <option value="">Все ученики</option>
                {learners?.map((l) => <option key={l.id} value={l.id}>{l.name || l.email}</option>)}
              </select>
            </label>
          </div>

          {error && <p className="error">{error}</p>}
          {!data && !error && <p className="quiet">Загружаю…</p>}
          {chart && detail && (
            <>
              <div className="ov-section">
                {chart.length === 0 ? <p className="quiet">За этот период расходов нет.</p> : <SpendChart spend={chart} today={today} days={days} />}
                <ServiceLegend sums={detail.by_service} />
              </div>

              {!learner && detail.by_learner.length > 0 && (
                <div className="ov-section">
                  <div className="ov-section-head"><h2>По ученикам</h2></div>
                  <table className="adm-table ov-table">
                    <thead><tr><th>Ученик</th><th className="num">Вызовов</th><th className="num">Расход</th></tr></thead>
                    <tbody>
                      {detail.by_learner.map((l) => (
                        <tr key={l.learner_id} className="pickable" onClick={() => setLearner(l.learner_id)}>
                          <td><div className="name">{l.name || '—'}</div><div className="sub">{l.email}</div></td>
                          <td className="num">{l.calls}</td>
                          <td className="num">{usd(l.usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detail.rows.length > 0 && (
                <div className="ov-section">
                  <div className="ov-section-head"><h2>Все записи</h2><span className="credit">ученик · день · сервис</span></div>
                  <div className="table-wrap">
                    <table className="adm-table ov-table" style={{ minWidth: 640 }}>
                      <thead><tr><th>День</th><th>Ученик</th><th>Сервис</th><th className="num">Вызовов</th><th className="num">Расход</th></tr></thead>
                      <tbody>
                        {detail.rows.map((r, i) => (
                          <tr key={i}>
                            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.day)}</td>
                            <td><div className="name">{r.name || '—'}</div><div className="sub">{r.email}</div></td>
                            <td><span className="svc"><i className={`svc-${r.service}`} />{serviceLabel(r.service)}</span></td>
                            <td className="num">{r.calls}</td>
                            <td className="num">{usdFine(r.usd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
