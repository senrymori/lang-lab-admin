import { useCallback, useState } from 'react'
import { type NewCode, api } from '../api'
import { fmtDate } from '../format'
import { useLoad } from '../useLoad'

const EMPTY: NewCode = { name: '', email: '', note: '', lessons: 12, days: null, kind: 'invite', max_uses: 1, expires_in_days: 14 }

export function Codes({ onAuthError }: { onAuthError: () => void }) {
  const { data, error, reload } = useLoad(useCallback(() => api.codes(), []), onAuthError)
  const [form, setForm] = useState<NewCode>(EMPTY)
  const [made, setMade] = useState<{ code: string; email: string | null } | null>(null)
  const [failed, setFailed] = useState('')

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const invite = form.kind === 'invite'
      const c = await api.newCode({ ...form, max_uses: invite ? 1 : form.max_uses, name: invite ? form.name : '',
        email: invite ? form.email.trim() : '' })
      setMade({ code: c.code, email: c.sent ? c.email : null })
      setForm(EMPTY)
      setFailed('')
      await reload()
    } catch (err) {
      setFailed(String(err instanceof Error ? err.message : err))
    }
  }
  const toggle = async (code: string, active: boolean) => {
    try {
      await api.setCodeActive(code, active)
      await reload()
    } catch (err) {
      setFailed(String(err instanceof Error ? err.message : err))
    }
  }
  const resend = async (code: string) => {
    try {
      const c = await api.sendInvite(code)
      setMade({ code: c.code, email: c.email })
      setFailed('')
      await reload()
    } catch (err) {
      setFailed(String(err instanceof Error ? err.message : err))
    }
  }
  const set = <K extends keyof NewCode>(k: K, v: NewCode[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      <form className="card new-code" onSubmit={create}>
        <h2>Новый код</h2>
        {form.kind === 'invite' ? (
          <>
            <label>
              Как репетитору обращаться
              <input required maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Аня" />
            </label>
            <label>
              Почта — пришлём приглашение со ссылкой
              <input type="email" maxLength={320} value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="без почты — просто код" />
            </label>
            <label className="wide">
              Заметка для себя
              <input maxLength={200} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="коллега, B1, хочет говорить" />
            </label>
          </>
        ) : (
          <label className="wide">
            Где опубликован
            <input required maxLength={200} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="телеграм-канал" />
          </label>
        )}
        <label>
          Вид
          <select value={form.kind} onChange={(e) => set('kind', e.target.value as NewCode['kind'])}>
            <option value="invite">личный (1 человек)</option>
            <option value="promo">промо (много)</option>
          </select>
        </label>
        <label>
          Уроков
          <input type="number" min={1} max={1000} required value={form.lessons} onChange={(e) => set('lessons', +e.target.value)} />
        </label>
        <label>
          Срок на уроки, дней
          <input type="number" min={1} max={3650} placeholder="без срока" value={form.days ?? ''}
            onChange={(e) => set('days', e.target.value ? +e.target.value : null)} />
        </label>
        {form.kind === 'promo' && (
          <label>
            Сколько раз
            <input type="number" min={1} required value={form.max_uses} onChange={(e) => set('max_uses', +e.target.value)} />
          </label>
        )}
        <label>
          Сгорает через, дней
          <input type="number" min={1} max={365} placeholder="никогда" value={form.expires_in_days ?? ''}
            onChange={(e) => set('expires_in_days', e.target.value ? +e.target.value : null)} />
        </label>
        <button>{form.kind === 'invite' && form.email.trim() ? 'Создать и отправить' : 'Создать'}</button>
        {made && (
          <p className="made">
            {made.email ? <>Приглашение ушло на <b>{made.email}</b>. </> : null}
            Код: <b>{made.code}</b>{' '}
            <button type="button" className="ghost" onClick={() => navigator.clipboard.writeText(made.code)}>Скопировать</button>
          </p>
        )}
        {failed && <p className="error">{failed}</p>}
      </form>

      <section className="card">
        <h2>Все коды</h2>
        {error && <p className="error">{error}</p>}
        {data && data.length === 0 && <p className="muted">Кодов пока нет.</p>}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Код</th><th>Кому</th><th className="num">Уроков</th><th className="num">Использован</th><th>Сгорает</th><th /></tr>
              </thead>
              <tbody>
                {data.map((c) => {
                  const spent = c.used >= c.max_uses
                  return (
                    <tr key={c.code} className={!c.active || spent ? 'dim' : ''}>
                      <td className="mono">{c.code} {c.kind === 'promo' && <span className="pill">промо</span>}</td>
                      <td>
                        {c.name || c.note}
                        {c.email && <div className="muted small">{c.email}{c.sent ? ' · приглашение отправлено' : ''}</div>}
                        {c.name && c.note && <div className="muted small">{c.note}</div>}
                      </td>
                      <td className="num">{c.lessons}{c.days ? <span className="muted small"> / {c.days} дн.</span> : null}</td>
                      <td className="num">{c.used} / {c.max_uses}</td>
                      <td className="small">{fmtDate(c.expires_at)}</td>
                      <td className="actions">
                        {!spent && c.active && c.email && (
                          <button className="ghost" onClick={() => resend(c.code)}>Отправить ещё раз</button>
                        )}
                        {!spent && (
                          <button className="ghost" onClick={() => toggle(c.code, !c.active)}>{c.active ? 'Отключить' : 'Включить'}</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
