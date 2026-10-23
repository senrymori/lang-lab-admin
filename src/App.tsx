import { useEffect, useState } from 'react'
import { ApiError, api, getKey, setKey } from './api'
import { Codes } from './pages/Codes'
import { Learners } from './pages/Learners'
import { Overview } from './pages/Overview'

const TABS = { overview: 'Обзор', learners: 'Ученики', codes: 'Коды доступа' } as const
type Tab = keyof typeof TABS

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
    <div className="shell">
      <header className="top">
        <div className="brand">Language Lab <span>админка</span></div>
        <nav>
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <a key={t} href={`#${t}`} className={t === tab ? 'on' : ''}>
              {TABS[t]}
            </a>
          ))}
        </nav>
        <button className="ghost" onClick={signOut}>Выйти</button>
      </header>
      <main>
        {tab === 'overview' && <Overview onAuthError={signOut} />}
        {tab === 'learners' && <Learners onAuthError={signOut} />}
        {tab === 'codes' && <Codes onAuthError={signOut} />}
      </main>
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
      setError(err instanceof ApiError && err.status === 401 ? 'Ключ не подходит' : String(err))
    }
  }
  return (
    <form className="card signin" onSubmit={submit}>
      <h1>Language Lab — админка</h1>
      <p className="muted">Ключ админки лежит на сервере в /etc/langlab/keys/admin.key</p>
      <input type="password" autoFocus placeholder="Ключ" value={key} onChange={(e) => setValue(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button disabled={!key.trim()}>Войти</button>
    </form>
  )
}
