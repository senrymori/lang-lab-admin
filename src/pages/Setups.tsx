import { useCallback } from 'react'
import { type Setups as SetupsData, api } from '../api'
import { fmtDateTime, plural } from '../format'
import { useLoad } from '../useLoad'

const LANG: Record<string, string> = { en: 'Английский', es: 'Испанский', it: 'Итальянский', kk: 'Казахский' }
const HOW: [keyof SetupsData['how'], string][] = [['custom', 'Настроили сами'], ['lemur', 'На усмотрение лемура'], ['last', 'Как в прошлый раз']]

/** A count with its share as a bar: what is chosen most at a glance. */
function Counts({ rows, of }: { rows: { key: string; title: string; n: number }[]; of: number }) {
  return (
    <table className="adm-table counts">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td style={{ width: 220 }}>{r.title}</td>
            <td><div className="share"><i style={{ width: of ? `${(100 * r.n) / of}%` : 0 }} /></div></td>
            <td className="num" style={{ width: 90 }}>{r.n}<span className="sub"> · {of ? Math.round((100 * r.n) / of) : 0}%</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** What learners choose before a lesson: how they start, what they want to work on and talk about, and what they
 * write in their own words — to see what the cards are missing. */
export function Setups({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => api.setups(), [])
  const { data: d, error } = useLoad(load, onAuthError)
  const custom = d?.how.custom ?? 0

  return (
    <>
      <section className="band ll-grain" data-theme="dark">
        <div className="wrap page-head">
          <h1>Настройки уроков</h1>
          {d && <span className="sub-line">{d.total ? `${d.total} ${plural(d.total, ['урок', 'урока', 'уроков'])} с настройкой` : 'Пока никто не настраивал урок'}</span>}
        </div>
      </section>
      <section className="band body ll-grain" data-theme="light">
        <div className="wrap stack">
          {error && <p className="error">{error}</p>}
          {!d && !error && <p className="quiet">Загружаю…</p>}
          {d && d.total > 0 && (
            <>
              <h2 className="h2">Как начинают урок</h2>
              <Counts rows={HOW.map(([key, title]) => ({ key, title, n: d.how[key] ?? 0 }))} of={d.total} />
              <h2 className="h2">Что подтянуть <span className="sub">— из {custom} {plural(custom, ['урока', 'уроков', 'уроков'])}, настроенных вручную</span></h2>
              <Counts rows={d.focus} of={custom} />
              <h2 className="h2">О чём поговорить</h2>
              <Counts rows={d.topics} of={custom} />
              <h2 className="h2">Своими словами <span className="sub">— чего не хватает в карточках</span></h2>
              {d.own.length === 0 ? <p className="quiet">Своими словами пока не писали.</p> : (
                <div className="table-wrap">
                  <table className="adm-table" style={{ minWidth: 760 }}>
                    <colgroup><col style={{ width: 240 }} /><col style={{ width: 170 }} /><col /><col style={{ width: 150 }} /></colgroup>
                    <thead><tr><th>Ученик</th><th>Что</th><th>Написал</th><th>Когда</th></tr></thead>
                    <tbody>
                      {d.own.map((o) => (
                        <tr key={o.learner_id + o.ts + o.what}>
                          <td><div className="name">{o.name || '—'}</div><div className="sub">{o.email} · {LANG[o.lang] ?? o.lang}</div></td>
                          <td>{o.what}{o.topic && <div className="sub">{o.topic}</div>}</td>
                          <td>{o.text}</td>
                          <td className="sub">{fmtDateTime(o.ts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
