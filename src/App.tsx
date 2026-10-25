import { useEffect, useRef, useState } from 'react'
import { ApiError, api, getKey, setKey } from './api'
import lemur from './assets/lemur-headphones-upside-down.webp'
import { Codes } from './pages/Codes'
import { Feedback } from './pages/Feedback'
import { Languages } from './pages/Languages'
import { Learners } from './pages/Learners'
import { Overview } from './pages/Overview'
import { Requests } from './pages/Requests'
import { Setups } from './pages/Setups'
import { Spend } from './pages/Spend'
import { Mark } from './ui'

const TABS = { overview: 'Обзор', spend: 'Расходы', requests: 'Заявки', learners: 'Ученики', languages: 'Языки', feedback: 'Отзывы', setups: 'Настройки уроков', codes: 'Коды доступа' } as const
type Tab = keyof typeof TABS
/** The header: a tab of its own, or a group that opens a list of its tabs (too many to stand in a row). */
const NAV: (Tab | { title: string; tabs: Tab[] })[] = [
  'overview',
  { title: 'Люди', tabs: ['learners', 'requests', 'codes'] },
  { title: 'Обучение', tabs: ['languages', 'feedback', 'setups'] },
  'spend',
]

/** A group in the header: its name (marked when one of its tabs is open) opens the list of its tabs. */
function NavGroup({ title, tabs, tab }: { title: string; tabs: Tab[]; tab: Tab }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    addEventListener('mousedown', away)
    addEventListener('keydown', away)
    return () => { removeEventListener('mousedown', away); removeEventListener('keydown', away) }
  }, [open])
  const here = tabs.includes(tab)
  return (
    <div className="nav-group" ref={ref}>
      <button type="button" className={`nav-group-name${here ? ' here' : ''}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        {title}{here && <span className="nav-group-tab"> · {TABS[tab]}</span>} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="nav-menu" role="menu">
          {tabs.map((t) => (
            <a key={t} role="menuitem" href={`#${t}`} aria-current={t === tab ? 'page' : undefined} onClick={() => setOpen(false)}>{TABS[t]}</a>
          ))}
        </div>
      )}
    </div>
  )
}

const tabFromHash = (): Tab => {
  const t = location.hash.slice(1)
  return t in TABS ? (t as Tab) : 'overview'
}

export function App() {
  const [signedIn, setSignedIn] = useState(Boolean(getKey()))
  const [tab, setTab] = useState<Tab>(tabFromHash)

  useEffect(() => {
    const on = () => setTab(tabFromHash())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  if (!signedIn) return <SignIn onDone={() => setSignedIn(true)} />

  const signOut = () => {
    setKey('')
    setSignedIn(false)
  }
  return (
    <div className="frame">
      <header className="band ll-grain" data-theme="dark">
        <div className="top">
          <nav className="ll-nav">
            <Mark />
            <div className="ll-nav-links">
              {NAV.map((n) => (typeof n === 'string'
                ? <a key={n} href={`#${n}`} aria-current={n === tab ? 'page' : undefined}>{TABS[n]}</a>
                : <NavGroup key={n.title} title={n.title} tabs={n.tabs} tab={tab} />))}
            </div>
          </nav>
          <button className="logout" type="button" onClick={signOut}>Выйти</button>
        </div>
      </header>
      {tab === 'overview' && <Overview onAuthError={signOut} />}
      {tab === 'spend' && <Spend onAuthError={signOut} />}
      {tab === 'requests' && <Requests onAuthError={signOut} />}
      {tab === 'learners' && <Learners onAuthError={signOut} />}
      {tab === 'languages' && <Languages onAuthError={signOut} />}
      {tab === 'feedback' && <Feedback onAuthError={signOut} />}
      {tab === 'setups' && <Setups onAuthError={signOut} />}
      {tab === 'codes' && <Codes onAuthError={signOut} />}
    </div>
  )
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [key, setValue] = useState('')
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setKey(key.trim())
    try {
      await api.overview()
      onDone()
    } catch (err) {
      setKey('')
      setError(err instanceof ApiError && err.status === 401 ? 'Ключ не подходит. Проверь и попробуй ещё раз.' : String(err))
    }
  }
  return (
    <section className="band signin ll-grain" data-theme="dark">
      <img className="signin-lemur" src={lemur} alt="Лемур в наушниках свесился вниз головой и подслушивает уроки" />
      <Mark href="#" />
      <form onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="credit">Админка · только для своих</span>
          <h1>Журнал</h1>
          <span className="hand">кто сегодня учился?</span>
        </div>
        <label>
          <span className="credit">Ключ</span>
          <input className={`adm-key${error ? ' bad' : ''}`} type="password" autoFocus autoComplete="current-password" value={key}
            onChange={(e) => setValue(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div>
          <button className="adm-go" disabled={!key.trim()}>Открыть журнал <span aria-hidden="true">→</span></button>
        </div>
      </form>
    </section>
  )
}
