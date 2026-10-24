import { Fragment, useCallback, useState } from 'react'
import { type AccessRequest, api } from '../api'
import { fmtDateTime, fmtDayLong } from '../format'
import { Choice, Copy, Field, More } from '../ui'
import { useLoad } from '../useLoad'

const WAITS = 14 // days the invite's code waits for its sign-in

export function Requests({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => api.requests(), [])
  const { data: all, error, reload } = useLoad(load, onAuthError)
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [made, setMade] = useState<{ code: string; email: string | null } | null>(null)
  const [failed, setFailed] = useState('')

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await reload()
      setOpen(null)
      setFailed('')
    } catch (e) {
      setFailed(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }
  const invite = (r: AccessRequest, name: string, n: number, term: number | null) => act(async () => {
    const c = await api.newCode({ kind: 'invite', name, email: r.email, note: 'заявка с сайта', lessons: n, days: term,
      max_uses: 1, expires_in_days: WAITS, request: r.id })
    setMade({ code: c.code, email: c.sent ? c.email : null })
  })
  const dismiss = (r: AccessRequest) => {
    if (window.confirm(`Отклонить заявку ${r.name}? Она удалится, письма не будет.`)) act(() => api.dismissRequest(r.id))
  }

  const head = (
    <section className="band ll-grain" data-theme="dark">
      <div className="wrap page-head">
        <h1>Заявки</h1>
        {all && <span className="sub-line">
          {all.length ? `Ждут ответа ${all.length}` : 'Новых заявок нет'}
        </span>}
      </div>
    </section>
  )

  return (
    <>
      {head}
      <section className="band body ll-grain" data-theme="light">
        <div className="wrap stack">
          {made && (
            <div className="made" role="status">
              <span className="wait"><i className="dot" />{made.email ? `Приглашение ушло на ${made.email}. Код:` : 'Код готов:'}</span>
              <span className="code-big">{made.code}</span>
              <Copy text={made.code} />
            </div>
          )}
          {(error || failed) && <p className="error">{error || failed}</p>}
          {!all && !error && <p className="quiet">Загружаю…</p>}
          {all?.length === 0 && <p className="quiet">Заявки с сайта появятся здесь.</p>}
          {all && all.length > 0 && (
            <div className="table-wrap has-menu">
              <table className="adm-table" style={{ minWidth: 720 }}>
                <colgroup><col /><col style={{ width: 200 }} /><col style={{ width: 200 }} /></colgroup>
                <thead>
                  <tr><th>Кто</th><th>Когда</th><th /></tr>
                </thead>
                <tbody>
                  {all.map((r) => [
                    <tr key={r.id}>
                      <td><div className="name">{r.name}</div><div className="sub">{r.email}</div></td>
                      <td style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</td>
                      <td>
                        <div className="row-actions">
                          {open !== r.id && <button className="quiet-btn" type="button" onClick={() => setOpen(r.id)}>Пригласить</button>}
                          <More label={`Ещё действия: ${r.name}`} items={[{ label: 'Отклонить', onClick: () => dismiss(r) }]} />
                        </div>
                      </td>
                    </tr>,
                    <Fragment key={`${r.id}-panel`}>
                      {open === r.id && (
                        <tr className="adding">
                          <td colSpan={3}>
                            <Invite r={r} busy={busy} onCancel={() => setOpen(null)} onDone={(...a) => invite(r, ...a)} />
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

/** An invite from the request: the name the tutor will use, how many lessons and for how long; the letter goes at once. */
function Invite({ r, busy, onCancel, onDone }: {
  r: AccessRequest
  busy: boolean
  onCancel: () => void
  onDone: (name: string, n: number, term: number | null) => void
}) {
  const [name, setName] = useState(r.name.split(' ')[0])
  const [n, setN] = useState(12)
  const [term, setTerm] = useState<number | null>(null)
  const until = new Date(Date.now() + WAITS * 86400000)
  return (
    <form className="add-panel" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onDone(name.trim(), n, term) }}>
      <Field label="Имя" hint="Так к человеку обратится лемур" required maxLength={80} value={name} autoFocus
        onChange={(e) => setName(e.target.value)} />
      <Choice label="Сколько уроков" value={n} onChange={setN}
        options={[6, 12, 24].map((v) => ({ value: v, label: String(v) }))} own={{ label: 'Своё число уроков', max: 1000 }} />
      <Choice<number | null> label="За сколько их пройти" value={term} onChange={setTerm}
        options={[{ value: null, label: 'Без срока' }, { value: 30, label: '30 дней' }, { value: 60, label: '60 дней' }]} />
      <div className="add-panel-end">
        <span className="q-hint">Код ждёт входа до {fmtDayLong(until)}</span>
        <button type="button" className="cancel" onClick={onCancel}>Отмена</button>
        <button className="ll-btn ll-btn-fur" disabled={busy || !name.trim() || n < 1}>
          Отправить приглашение
        </button>
      </div>
    </form>
  )
}
