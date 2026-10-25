import { Fragment, useCallback, useState } from 'react'
import { type Learner, api } from '../api'
import { fmtDate, fmtDateTime, lessons, plural, usd } from '../format'
import { Choice, More } from '../ui'
import { useLoad } from '../useLoad'

const MODE: Record<string, string> = { learn: 'сейчас на уроке', placement: 'определяет уровень' }

type Open = { id: string; mode: 'add' | 'set' }

export function Learners({ onAuthError }: { onAuthError: () => void }) {
  const load = useCallback(() => Promise.all([api.learners(), api.overview()]), [])
  const { data, error, reload } = useLoad(load, onAuthError)
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState<Open | null>(null)
  const [failed, setFailed] = useState('')

  const change = async (l: Learner, c: Parameters<typeof api.changeLearner>[1], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(l.id)
    try {
      await api.changeLearner(l.id, c)
      await reload()
      setOpen(null)
      setFailed('')
    } catch (e) {
      setFailed(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy('')
    }
  }

  const all = data?.[0]
  const max = data?.[1].max_learners
  const liveN = all?.filter((l) => l.live).length ?? 0
  const head = (
    <section className="band ll-grain" data-theme="dark">
      <div className="wrap page-head">
        <h1>Ученики</h1>
        {all && max !== undefined && (
          <div className="sub-line">
            <span>Занято {all.length} {plural(all.length, ['место', 'места', 'мест'])} из {max}</span>
            {liveN > 0 && <span className="live" style={{ fontSize: 16, lineHeight: '24px' }}><i className="dot" />{liveN} сейчас на уроке</span>}
          </div>
        )}
      </div>
    </section>
  )
  const body = (inner: React.ReactNode) => (
    <>
      {head}
      <section className="band body ll-grain" data-theme="light"><div className="wrap">{inner}</div></section>
    </>
  )

  if (error) return body(<p className="error">{error}</p>)
  if (!all) return body(<p className="quiet">Загружаю…</p>)
  if (all.length === 0) {
    return body(<p className="quiet">Учеников пока нет. Первый код можно сделать в <a href="#codes">кодах доступа</a>.</p>)
  }

  const left = (l: Learner) => l.lessons_total - l.lessons_used
  const ended = all.filter((l) => l.status === 'active' && left(l) <= 0)
  // live ones on top, the rest as they came
  const learning = all.filter((l) => l.status === 'active' && left(l) > 0).sort((a, b) => Number(!!b.live) - Number(!!a.live))
  const blocked = all.filter((l) => l.status === 'blocked')

  const more = (l: Learner) => (
    <More label={`Ещё действия: ${l.name || l.email}`} items={[
      { label: 'Изменить число уроков', onClick: () => setOpen({ id: l.id, mode: 'set' }) },
      { label: 'Заблокировать', onClick: () => change(l, { status: 'blocked' },
        `Заблокировать ${l.name || l.email}? Текущий урок остановится, в приложении он увидит бан.`) },
    ]} />
  )
  const panel = (l: Learner) => open?.id === l.id && (
    <tr className="adding">
      <td colSpan={5}>
        {open.mode === 'add'
          ? <AddLessons busy={busy === l.id} onCancel={() => setOpen(null)} onDone={(n) => change(l, { add_lessons: n })} />
          : <SetLessons l={l} busy={busy === l.id} onCancel={() => setOpen(null)}
              onDone={(n) => change(l, { add_lessons: n - l.lessons_total })} />}
      </td>
    </tr>
  )
  const who = (l: Learner) => (
    <>
      <div className="name">{l.name || '—'}</div>
      <div className="sub">{l.email}</div>
    </>
  )
  const spent = (l: Learner) => <td className="num">{usd(l.spent_30d_usd)}<div className="sub">всего {usd(l.spent_total_usd)}</div></td>
  const seen = (l: Learner) => <td style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{l.live ? 'сейчас' : fmtDateTime(l.last_seen_at)}</td>
  const until = (l: Learner) => {
    if (!l.access_until) return ''
    const d = new Date(l.access_until)
    return d.getTime() < Date.now() ? ` · срок вышел ${fmtDate(d)}` : ` · до ${fmtDate(d)}`
  }

  return body(
    <>
      {failed && <p className="error" style={{ marginBottom: 24 }}>{failed}</p>}
      <div className="table-wrap has-menu">
        <table className="adm-table" style={{ minWidth: 960 }}>
          <colgroup><col /><col style={{ width: 180 }} /><col style={{ width: 170 }} /><col style={{ width: 150 }} /><col style={{ width: 250 }} /></colgroup>
          <thead>
            <tr><th>Ученик</th><th>Уроки</th><th>Был</th><th className="num">Расход, 30 дней</th><th /></tr>
          </thead>

          {/* lessons ran out: what one comes here for */}
          {ended.length > 0 && (
            <tbody>
              <tr className="group"><td colSpan={5}><span className="group-title">Уроки закончились</span><span className="group-note">урок не начнётся, пока не добавишь</span></td></tr>
              {ended.map((l) => [
                <tr key={l.id}>
                  <td>{who(l)}</td>
                  <td><div>{l.lessons_used} из {l.lessons_total}</div><div className="sub" style={{ color: 'var(--ink)' }}>все пройдены{until(l)}</div></td>
                  {seen(l)}
                  {spent(l)}
                  <td>
                    <div className="row-actions">
                      {open?.id !== l.id && (
                        <button className="ll-btn ll-btn-fur" type="button" onClick={() => setOpen({ id: l.id, mode: 'add' })}>Добавить уроки</button>
                      )}
                      {more(l)}
                    </div>
                  </td>
                </tr>,
                <Fragment key={`${l.id}-panel`}>{panel(l)}</Fragment>,
              ])}
            </tbody>
          )}

          {learning.length > 0 && (
            <tbody>
              <tr className="group"><td colSpan={5}><span className="group-title">Учатся</span></td></tr>
              {learning.map((l) => [
                <tr key={l.id}>
                  <td>
                    {who(l)}
                    {l.live && (
                      <div className="live" style={{ marginTop: 6 }}><i className="dot" />{MODE[l.live] ?? 'на уроке'} · {usd(l.spent_today_usd)} сегодня</div>
                    )}
                  </td>
                  <td>
                    <div>{l.lessons_used} из {l.lessons_total}</div>
                    <div className="sub" style={left(l) <= 3 ? { color: 'var(--ink)' } : undefined}>осталось {left(l)}{until(l)}</div>
                  </td>
                  {seen(l)}
                  {spent(l)}
                  <td>
                    <div className="row-actions">
                      <button className="quiet-btn" type="button" onClick={() => setOpen({ id: l.id, mode: 'add' })}>Добавить уроки</button>
                      {more(l)}
                    </div>
                  </td>
                </tr>,
                <Fragment key={`${l.id}-panel`}>{panel(l)}</Fragment>,
              ])}
            </tbody>
          )}

          {/* blocked: apart, quieter */}
          {blocked.length > 0 && (
            <tbody className="soft">
              <tr className="group"><td colSpan={5}><span className="group-title">Заблокированы</span></td></tr>
              {blocked.map((l) => (
                <tr key={l.id}>
                  <td>
                    {who(l)}
                    {l.blocked_reason && (
                      <div className="sub" style={{ marginTop: 6 }}>
                        {l.blocked_reason[0].toUpperCase() + l.blocked_reason.slice(1)}{l.blocked_at && `, ${fmtDateTime(l.blocked_at)}`}
                      </div>
                    )}
                  </td>
                  <td>{l.lessons_used} из {l.lessons_total}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.last_seen_at)}</td>
                  {spent(l)}
                  <td style={{ textAlign: 'right' }}>
                    <button className="quiet-btn soft" type="button" disabled={busy === l.id} onClick={() => change(l, { status: 'active' })}>Разблокировать</button>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </>,
  )
}

function AddLessons({ busy, onCancel, onDone }: { busy: boolean; onCancel: () => void; onDone: (n: number) => void }) {
  const [n, setN] = useState(12)
  return (
    <form className="add-panel" onSubmit={(e) => { e.preventDefault(); onDone(n) }}>
      <Choice label="Сколько уроков добавить" value={n} onChange={setN}
        options={[6, 12, 24].map((v) => ({ value: v, label: String(v) }))} own={{ label: 'Своё число уроков', max: 1000 }} />
      <div className="add-panel-end">
        <button type="button" className="cancel" onClick={onCancel}>Отмена</button>
        <button className="ll-btn ll-btn-fur" disabled={busy || n < 1 || n > 1000}>Добавить {lessons(n)}</button>
      </div>
    </form>
  )
}

/** The total, set outright: lessons given by mistake are taken back, never below those already done. */
function SetLessons({ l, busy, onCancel, onDone }: { l: Learner; busy: boolean; onCancel: () => void; onDone: (n: number) => void }) {
  const [n, setN] = useState(String(l.lessons_total))
  const v = Math.floor(+n)
  const ok = n !== '' && v >= Math.max(1, l.lessons_used) && v !== l.lessons_total && Math.abs(v - l.lessons_total) <= 1000
  return (
    <form className="add-panel" onSubmit={(e) => { e.preventDefault(); if (ok) onDone(v) }}>
      <div className="q">
        <label className="q-label" htmlFor={`total-${l.id}`}>Сколько уроков всего</label>
        <input className="own" id={`total-${l.id}`} type="number" min={Math.max(1, l.lessons_used)} value={n} autoFocus
          aria-describedby={`total-${l.id}-hint`} onChange={(e) => setN(e.target.value)} />
        <span className="q-hint" id={`total-${l.id}-hint`}>Пройдено {l.lessons_used}, меньше нельзя</span>
      </div>
      <div className="add-panel-end">
        <button type="button" className="cancel" onClick={onCancel}>Отмена</button>
        <button className="ll-btn ll-btn-fur" disabled={busy || !ok}>Сохранить</button>
      </div>
    </form>
  )
}
