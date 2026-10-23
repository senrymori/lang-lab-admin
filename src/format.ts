const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const fmtDate = (s: string | null) => (s ? date.format(new Date(s)) : '—')
export const fmtDateTime = (s: string | null) => (s ? dateTime.format(new Date(s)) : '—')
export const usd = (n: number) => `$${n.toFixed(n < 10 ? 2 : 0)}`
