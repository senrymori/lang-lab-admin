import { useCallback } from 'react'
import { api } from '../api'
import { plural, usd } from '../format'
import { useLoad } from '../useLoad'

const LANG: Record<string, string> = { en: 'Английский', es: 'Испанский', it: 'Итальянский', kk: 'Казахский' }
const ORDER = ['preA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const byLevel = (a: string, b: string) => ORDER.indexOf(a.replace(/[+-]$/, '')) - ORDER.indexOf(b.replace(/[+-]$/, '')) || a.localeCompare(b)

/** Each language at a glance: where the learners are, what they do there, how they rate it, what it costs. */
export function Languages({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => api.languages(), [])
  const { data: rows, error } = useLoad(load, onAuthError)
  const taken = rows?.filter((r) => r.learners > 0) ?? []

  return (
    <>
      <section className="band ll-grain" data-theme="dark">
        <div className="wrap page-head">
          <h1>Языки</h1>
          {rows && <span className="sub-line">{taken.length ? `учат ${taken.length} ${plural(taken.length, ['язык', 'языка', 'языков'])} из ${rows.length}` : 'Пока никто не начал'}</span>}
        </div>
      </section>
      <section className="band body ll-grain" data-theme="light">
        <div className="wrap stack">
          {error && <p className="error">{error}</p>}
          {!rows && !error && <p className="quiet">Загружаю…</p>}
          {rows && (
            <div className="table-wrap">
              <table className="adm-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr><th>Язык</th><th className="num">Ученики</th><th className="num">Уроки</th><th className="num">Проверки уровня</th>
                    <th>Уровни</th><th className="num">Оценка</th><th className="num">Репетитор, 30 дней</th><th className="num">Всего</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.lang} style={r.learners ? undefined : { color: 'var(--ink-soft)' }}>
                      <td><div className="name">{LANG[r.lang] ?? r.name}</div></td>
                      <td className="num">{r.learners}</td>
                      <td className="num">{r.lessons}</td>
                      <td className="num">{r.placements}</td>
                      <td>{Object.keys(r.levels).length
                        ? Object.entries(r.levels).sort(([a], [b]) => byLevel(a, b)).map(([lv, n]) => `${lv} × ${n}`).join(' · ')
                        : <span className="sub">—</span>}</td>
                      <td className="num">{r.rating === null ? '—' : r.rating.toFixed(1).replace('.', ',')}</td>
                      <td className="num">{usd(r.usd_30d)}</td>
                      <td className="num">{usd(r.usd_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="sub">Расход здесь — модель репетитора на уроках и проверках этого языка. Распознавание речи и голоса по языкам не делятся — они на «Расходах».</p>
        </div>
      </section>
    </>
  )
}
