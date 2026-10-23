import { useCallback, useState } from 'react'
import { type Learner, api } from '../api'
import { fmtDateTime, usd } from '../format'
import { useLoad } from '../useLoad'

const MODE: Record<string, string> = { learn: 'урок', placement: 'определение уровня' }

export function Learners({ onAuthError }: { onAuthError: () => void }) {
  const { data, error, reload } = useLoad(useCallback(() => api.learners(), []), onAuthError)
  const [busy, setBusy] = useState('')
  const [adding, setAdding] = useState<Record<string, number>>({})
  const [failed, setFailed] = useState('')

  const change = async (l: Learner, c: Parameters<typeof api.changeLearner>[1], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(l.id)
    try {
      await api.changeLearner(l.id, c)
      await reload()
      setFailed('')
    } catch (e) {
      setFailed(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy('')
    }
  }

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Загружаю…</p>
  if (data.length === 0) return <p className="muted card">Учеников пока нет — выдайте код на вкладке «Коды доступа».</p>
  return (
    <section className="card">
      {failed && <p className="error">{failed}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ученик</th>
              <th>Уроки</th>
              <th>Был</th>
              <th className="num">Сегодня</th>
              <th className="num">30 дней</th>
              <th className="num">Всего</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((l) => {
              const leftN = l.lessons_total - l.lessons_used
              const add = adding[l.id] ?? 12
              return (
                <tr key={l.id} className={l.status === 'blocked' ? 'dim' : ''}>
                  <td>
                    <div className="strong">{l.name || '—'} {l.live && <span className="pill live">{MODE[l.live] ?? l.live}</span>}</div>
                    <div className="muted small">{l.email}</div>
                  </td>
                  <td>
                    {l.status === 'blocked' ? (
                      <>
                        <span className="pill bad">заблокирован</span>
                        {l.blocked_reason && <div className="small muted">{l.blocked_reason}{l.blocked_at && `, ${fmtDateTime(l.blocked_at)}`}</div>}
                      </>
                    ) : (
                      <>
                        <div>{l.lessons_used} из {l.lessons_total}</div>
                        <div className={`small ${leftN > 0 ? 'muted' : 'error'}`}>{leftN > 0 ? `осталось ${leftN}` : 'уроки закончились'}</div>
                      </>
                    )}
                  </td>
                  <td className="small">{fmtDateTime(l.last_seen_at)}</td>
                  <td className="num">{usd(l.spent_today_usd)}</td>
                  <td className="num">{usd(l.spent_30d_usd)}</td>
                  <td className="num">{usd(l.spent_total_usd)}</td>
                  <td className="actions">
                    <input className="count" type="number" min={1} max={1000} value={add} aria-label="Сколько уроков добавить"
                      onChange={(e) => setAdding((a) => ({ ...a, [l.id]: +e.target.value }))} />
                    <button className="ghost" disabled={busy === l.id || add < 1} onClick={() => change(l, { add_lessons: add })}>Добавить уроки</button>
                    {l.status === 'active' ? (
                      <button className="ghost danger" disabled={busy === l.id}
                        onClick={() => change(l, { status: 'blocked' }, `Заблокировать ${l.name || l.email}? Его выкинет со всех устройств и остановит текущий урок.`)}>
                        Заблокировать
                      </button>
                    ) : (
                      <button className="ghost" disabled={busy === l.id} onClick={() => change(l, { status: 'active' })}>Разблокировать</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
