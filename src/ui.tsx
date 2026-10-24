import { useEffect, useId, useRef, useState } from 'react'
import logo from './assets/logo.svg?raw'

/** LANG·LAB with the flask, inline so it takes the frame's colours (cream outline on the night band). */
export function Mark({ href }: { href?: string }) {
  return (
    <a className="ll-mark" href={href ?? '#overview'}>
      <span className="ll-mark-logo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logo }} />
      LANG<b>·</b>LAB
    </a>
  )
}

/** «⋯» next to a row: the rarer actions, out of the way. Closes on a pick, a click elsewhere or Escape. */
export function More({ label, items }: { label: string; items: { label: string; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => box.current?.contains(e.target as Node) || setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button className="more" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="menu" role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" onClick={() => { setOpen(false); it.onClick() }}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** A question answered by one of a few choices — or, with `own`, by a number of one's own. */
export function Choice<T extends string | number | null>({ label, value, options, onChange, own, hint, large }: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  own?: { label: string; min?: number; max?: number; placeholder?: string }
  hint?: React.ReactNode
  large?: boolean
}) {
  const id = useId()
  // one's own number is kept as typed; a choice made otherwise (a preset, a reset) clears it
  const [text, setText] = useState('')
  useEffect(() => {
    if (text && String(value) !== text) setText('')
  }, [value])
  return (
    <div className="q">
      <span className="q-label" id={id}>{label}</span>
      <div className="q-row">
        <div className={`seg${large ? ' seg-lg' : ''}`} role="group" aria-labelledby={id}>
          {options.map((o) => (
            <button key={String(o.value)} type="button" className={o.value === value ? 'on' : ''} aria-pressed={o.value === value}
              onClick={() => { setText(''); onChange(o.value) }}>{o.label}</button>
          ))}
        </div>
        {own && (
          <label className="or">или
            <input className="own" type="number" min={own.min ?? 1} max={own.max} placeholder={own.placeholder ?? 'число'}
              aria-label={own.label} value={text}
              onChange={(e) => { setText(e.target.value); if (+e.target.value > 0) onChange(+e.target.value as T) }} />
          </label>
        )}
      </div>
      {hint && <span className="q-hint">{hint}</span>}
    </div>
  )
}

/** «Скопировать» that says it did. */
export function Copy({ text, className = 'quiet-btn' }: { text: string; className?: string }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1600)
    return () => clearTimeout(t)
  }, [done])
  return (
    <button type="button" className={className} onClick={() => navigator.clipboard.writeText(text).then(() => setDone(true), () => {})}>
      {done ? 'Скопировано' : 'Скопировать'}
    </button>
  )
}

/** A text question: its label, the field, and a hint under it (described by, not part of, the label). */
export function Field({ label, hint, ...input }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="q">
      <label className="q-label" htmlFor={id}>{label}</label>
      <input className="field" id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint && <span className="q-hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  )
}
