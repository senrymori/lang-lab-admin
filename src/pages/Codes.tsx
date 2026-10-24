import { useCallback, useState } from 'react'
import { type Code, type Learner, type NewCode, api } from '../api'
import { days, fmtDate, fmtDayLong, lessons, plural } from '../format'
import { Choice, Copy, Field, More } from '../ui'
import { useLoad } from '../useLoad'

const EMPTY: NewCode = { name: '', email: '', note: '', lessons: 12, days: null, kind: 'invite', max_uses: 1, expires_in_days: 14 }
const SEATS = 50 // a promo's default: how many may come in by it

export function Codes({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => Promise.all([api.codes(), api.learners(), api.overview()]), [])
  const { data, error, reload } = useLoad(load, onAuthError)
  const [form, setForm] = useState<NewCode>(EMPTY)
  const [seats, setSeats] = useState(SEATS)
  const [made, setMade] = useState<{ code: string; email: string | null } | null>(null)
  const [failed, setFailed] = useState('')

  const invite = form.kind === 'invite'
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const c = await api.newCode({ ...form, max_uses: invite ? 1 : seats, name: invite ? form.name : '',
        email: invite ? form.email.trim() : '' })
      setMade({ code: c.code, email: c.sent ? c.email : null })
      setForm(EMPTY)
      setSeats(SEATS)
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

  const [codes, learners, overview] = data ?? [null, [] as Learner[], null]
  const free = overview && overview.max_learners - Object.values(overview.learners).reduce((a, n) => a + n, 0)
  const now = Date.now()
  const spent = (c: Code) => c.used >= c.max_uses
  const expired = (c: Code) => !!c.expires_at && new Date(c.expires_at).getTime() < now
  const groups = {
    active: codes?.filter((c) => c.active && !spent(c) && !expired(c)) ?? [],
    used: codes?.filter(spent) ?? [],
    off: codes?.filter((c) => !c.active && !spent(c)) ?? [],
    gone: codes?.filter((c) => c.active && !spent(c) && expired(c)) ?? [],
  }
  const count = codes && (codes.length === 0 ? 'Кодов пока нет' : [
    `Действуют ${groups.active.length}`,
    groups.used.length && `использованы ${groups.used.length}`,
    groups.off.length && `отключены ${groups.off.length}`,
    groups.gone.length && `сгорели ${groups.gone.length}`,
  ].filter(Boolean).join(', '))
  const by = new Map<string, Learner[]>()
  for (const l of learners) if (l.code) by.set(l.code, [...(by.get(l.code) ?? []), l])

  const until = new Date(now + (form.expires_in_days ?? 0) * 86400000)
  const term = form.days ? `за ${days(form.days)}` : 'без срока'
  const summary = (invite
    ? `${form.name.trim() || 'Человек'} получит ${lessons(form.lessons)} ${term}.`
    : `Войдут до ${seats} ${plural(seats, ['человека', 'человек', 'человек'])}, каждому ${lessons(form.lessons)} ${term}.`)
    + (form.expires_in_days ? ` Код ждёт до ${fmtDayLong(until)}.` : '')

  const gives = (c: Code) => <td><div>{lessons(c.lessons)}</div><div className="sub">{c.days ? `за ${days(c.days)}` : 'без срока'}</div></td>
  const burns = (c: Code) => (c.expires_at ? `сгорит ${fmtDate(c.expires_at)}` : 'не сгорает')
  const to = (c: Code) => c.kind === 'promo'
    ? <td><div>{c.note || '—'}</div></td>
    : <td><div>{c.name || '—'}</div><div className="sub">{c.email ?? 'без почты'}</div>{c.note && <div className="sub">{c.note}</div>}</td>
  const label = (c: Code, soft = false) => (
    <td><span className="code" style={soft ? { color: 'var(--ink-soft)' } : undefined}>{c.code}</span>{c.kind === 'promo' && <span className="tag">промо</span>}</td>
  )

  return (
    <>
      <section className="band ll-grain" data-theme="dark">
        <div className="wrap page-head">
          <h1>Коды доступа</h1>
          {count && <span className="sub-line">{count}</span>}
        </div>
      </section>

      <section className="band body codes-body ll-grain" data-theme="light">
        <div className="wrap">
          {/* a new code: the page's main action */}
          <div className="stack">
            <h2 className="h2">Новый код</h2>
            <form className="panel" onSubmit={create}>
              <Choice label="Для кого" large value={form.kind} onChange={(k) => set('kind', k)}
                options={[{ value: 'invite', label: 'Для одного человека' }, { value: 'promo', label: 'Промо для канала' }]} />

              {invite ? (
                <div className="panel-grid">
                  <Field label="Имя" hint="Так к человеку обратится лемур" required maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
                  <Field label="Почта" hint="Можно без почты, тогда просто получишь код" type="email" maxLength={320} value={form.email} onChange={(e) => set('email', e.target.value)} />
                  <Field label="Заметка для себя" hint="Видна только в админке" maxLength={200} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Например: коллега, хочет говорить" />
                </div>
              ) : (
                <div className="panel-grid">
                  <Field label="Где опубликуешь" hint="Чтобы потом понять, откуда пришли" required maxLength={200} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Например: телеграм-канал" />
                  <Choice label="Сколько человек может войти" value={seats} onChange={setSeats}
                    options={[20, 50, 100].map((v) => ({ value: v, label: String(v) }))} own={{ label: 'Своё число человек', max: 100000 }}
                    hint={free !== null && `Свободных мест сейчас ${Math.max(0, free)}`} />
                </div>
              )}

              <div className="panel-grid wide">
                <Choice label="Сколько уроков" value={form.lessons} onChange={(v) => set('lessons', v)}
                  options={[6, 12, 24].map((v) => ({ value: v, label: String(v) }))} own={{ label: 'Своё число уроков', max: 1000 }} />
                <Choice<number | null> label="За сколько их пройти" value={form.days} onChange={(v) => set('days', v)}
                  options={[{ value: null, label: 'Без срока' }, { value: 30, label: '30 дней' }, { value: 60, label: '60 дней' }]}
                  own={{ label: 'Свой срок, дней', max: 3650, placeholder: 'дней' }} hint="Отсчёт со входа" />
                <Choice<number | null> label="Сколько код ждёт входа" value={form.expires_in_days} onChange={(v) => set('expires_in_days', v)}
                  options={[7, 14, 30].map((v) => ({ value: v, label: days(v) }))}
                  own={{ label: 'Сколько дней ждёт код', max: 365, placeholder: 'дней' }} hint="Потом код сгорит" />
              </div>

              <div className="panel-foot">
                <span>{summary}</span>
                <button className="ll-btn ll-btn-fur">{invite && form.email.trim() ? 'Создать и отправить' : 'Создать код'}</button>
              </div>
              {failed && <p className="error">{failed}</p>}
            </form>

            {made && (
              <div className="made" role="status">
                <span className="wait"><i className="dot" />{made.email ? `Приглашение ушло на ${made.email}. Код:` : 'Код готов:'}</span>
                <span className="code-big">{made.code}</span>
                <Copy text={made.code} />
              </div>
            )}
          </div>

          {/* all codes: what still waits on top, the closed ones apart */}
          <div className="stack">
            <h2 className="h2">Все коды</h2>
            {error && <p className="error">{error}</p>}
            {codes && codes.length === 0 && <p className="quiet">Кодов пока нет.</p>}
            {codes && codes.length > 0 && (
              <div className="table-wrap has-menu">
                <table className="adm-table" style={{ minWidth: 960 }}>
                  <colgroup><col style={{ width: 200 }} /><col /><col style={{ width: 170 }} /><col style={{ width: 220 }} /><col style={{ width: 240 }} /></colgroup>
                  <thead>
                    <tr><th>Код</th><th>Кому</th><th>Даёт</th><th>Состояние</th><th /></tr>
                  </thead>

                  {groups.active.length > 0 && (
                    <tbody>
                      <tr className="group"><td colSpan={5}><span className="group-title">Действуют</span></td></tr>
                      {groups.active.map((c) => (
                        <tr key={c.code}>
                          {label(c)}
                          {to(c)}
                          {gives(c)}
                          <td>
                            {c.kind === 'promo' ? <div>Вошли {c.used} из {c.max_uses}</div> : <div className="wait"><i className="dot" />Ждёт входа</div>}
                            <div className="sub">{[c.kind === 'invite' && c.sent && 'письмо ушло', burns(c)].filter(Boolean).join(' · ')}</div>
                          </td>
                          <td>
                            <div className="row-actions">
                              {c.email ? (
                                <>
                                  <button className="quiet-btn" type="button" onClick={() => resend(c.code)}>Отправить ещё раз</button>
                                  <More label={`Ещё действия: ${c.code}`} items={[
                                    { label: 'Скопировать код', onClick: () => { navigator.clipboard.writeText(c.code).catch(() => {}) } },
                                    { label: 'Отключить', onClick: () => toggle(c.code, false) },
                                  ]} />
                                </>
                              ) : (
                                <>
                                  <Copy text={c.code} />
                                  <More label={`Ещё действия: ${c.code}`} items={[{ label: 'Отключить', onClick: () => toggle(c.code, false) }]} />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}

                  {groups.used.length > 0 && (
                    <tbody>
                      <tr className="group"><td colSpan={5}><span className="group-title">Использованы</span></td></tr>
                      {groups.used.map((c) => {
                        const who = by.get(c.code) ?? []
                        const one = c.kind === 'invite' ? who[0] : undefined
                        return (
                          <tr key={c.code}>
                            {label(c, true)}
                            {c.kind === 'promo' ? to(c) : (
                              <td>
                                {one ? <a className="learner" href="#learners">{one.name || c.name || one.email}</a> : <div>{c.name || '—'}</div>}
                                <div className="sub">{c.note || c.email || one?.email || 'без почты'}</div>
                              </td>
                            )}
                            {gives(c)}
                            <td><div>{c.kind === 'promo' ? `Вошли ${c.used} из ${c.max_uses}` : `Использован${one ? ` ${fmtDate(one.created_at)}` : ''}`}</div></td>
                            <td />
                          </tr>
                        )
                      })}
                    </tbody>
                  )}

                  {groups.gone.length > 0 && (
                    <tbody className="soft">
                      <tr className="group"><td colSpan={5}><span className="group-title">Сгорели</span></td></tr>
                      {groups.gone.map((c) => (
                        <tr key={c.code}>
                          {label(c)}
                          {to(c)}
                          {gives(c)}
                          <td>
                            <div>Сгорел {fmtDate(c.expires_at)}</div>
                            {c.kind === 'promo' && <div className="sub">вошли {c.used} из {c.max_uses}</div>}
                          </td>
                          <td />
                        </tr>
                      ))}
                    </tbody>
                  )}

                  {groups.off.length > 0 && (
                    <tbody className="soft">
                      <tr className="group"><td colSpan={5}><span className="group-title">Отключены</span></td></tr>
                      {groups.off.map((c) => (
                        <tr key={c.code}>
                          {label(c)}
                          {to(c)}
                          {gives(c)}
                          <td>
                            <div>Отключён вручную</div>
                            {c.kind === 'promo' && c.used > 0 && <div className="sub">вошли {c.used} из {c.max_uses}</div>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="quiet-btn soft" type="button" onClick={() => toggle(c.code, true)}>Включить</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
