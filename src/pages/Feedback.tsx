import { Fragment, useCallback, useState } from 'react'
import { type FeedbackRow, api } from '../api'
import { fmtDateTime, plural } from '../format'
import { useLoad } from '../useLoad'

const LANG: Record<string, string> = { en: 'Английский', es: 'Испанский', it: 'Итальянский', kk: 'Казахский' }
const MODE: Record<string, string> = { learn: 'Урок', placement: 'Определение уровня' }
const mean = (n: number | null) => (n === null ? '—' : n.toFixed(1).replace('.', ','))

/** What learners said after their lessons and placements: a row per learner and language, every answer under it. */
export function Feedback({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => api.feedback(), [])
  const { data: rows, error } = useLoad(load, onAuthError)
  const [open, setOpen] = useState<string | null>(null)

  const total = rows?.reduce((n, r) => n + r.items.length, 0) ?? 0
  const key = (r: FeedbackRow) => `${r.learner_id}/${r.lang}`
  const last = (r: FeedbackRow) => r.items.find((i) => i.comment)?.comment ?? ''

  return (
    <>
      <section className="band ll-grain" data-theme="dark">
        <div className="wrap page-head">
          <h1>Отзывы</h1>
          {rows && <span className="sub-line">{total ? `${total} ${plural(total, ['отзыв', 'отзыва', 'отзывов'])}` : 'Отзывов пока нет'}</span>}
        </div>
      </section>
      <section className="band body ll-grain" data-theme="light">
        <div className="wrap stack">
          {error && <p className="error">{error}</p>}
          {!rows && !error && <p className="quiet">Загружаю…</p>}
          {rows?.length === 0 && <p className="quiet">Отзывы появятся здесь после первых уроков.</p>}
          {rows && rows.length > 0 && (
            <div className="table-wrap">
              <table className="adm-table" style={{ minWidth: 860 }}>
                <colgroup><col style={{ width: 260 }} /><col style={{ width: 180 }} /><col style={{ width: 170 }} /><col /></colgroup>
                <thead>
                  <tr><th>Ученик</th><th>Язык и уровень</th><th>Средняя оценка</th><th>Последний комментарий</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => [
                    <tr key={key(r)}>
                      <td><div className="name">{r.name || '—'}</div><div className="sub">{r.email}</div></td>
                      <td><div>{LANG[r.lang] ?? r.lang}</div><div className="sub">{r.level ?? 'уровень не определён'}</div></td>
                      <td>
                        <button className="fb-mean" type="button" aria-expanded={open === key(r)}
                          onClick={() => setOpen(open === key(r) ? null : key(r))}>
                          <span className="fb-num">{mean(r.rating)}</span>
                          <span className="sub">{r.items.length} {plural(r.items.length, ['отзыв', 'отзыва', 'отзывов'])} {open === key(r) ? '↑' : '↓'}</span>
                        </button>
                      </td>
                      <td>{last(r) || <span className="sub">—</span>}</td>
                    </tr>,
                    <Fragment key={`${key(r)}-items`}>
                      {open === key(r) && (
                        <tr className="adding">
                          <td colSpan={4}>
                            <ol className="fb-items">
                              {r.items.map((i) => (
                                <li key={i.sid + i.ts}>
                                  <div className="fb-head">
                                    <span className="fb-num">{i.rating ?? '—'}</span>
                                    <span><b>{MODE[i.mode] ?? i.mode}</b> · <span className="sub">{fmtDateTime(i.ts)}</span></span>
                                  </div>
                                  {!!i.liked?.length && <p><span className="sub">Зашло:</span> {i.liked.join(', ')}</p>}
                                  {!!i.disliked?.length && <p><span className="sub">Не зашло:</span> {i.disliked.join(', ')}</p>}
                                  {i.why && <p><span className="sub">Почему:</span> {i.why}</p>}
                                  {i.comment && <p><span className="sub">Комментарий:</span> {i.comment}</p>}
                                </li>
                              ))}
                            </ol>
                          </td>
                        </tr>
                      )}
                    </Fragment>,
                  ])}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
