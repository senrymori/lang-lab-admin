const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const fmtDate = (s: string | null) => (s ? date.format(new Date(s)) : '—')
export const fmtDateTime = (s: string | null) => (s ? dateTime.format(new Date(s)) : '—')
export const usd = (n: number) => `$${n.toFixed(n < 10 ? 2 : 0)}`

/** «через 12 дн.» / «истёк 3 дн. назад» */
export function left(s: string | null): { text: string; over: boolean } {
  if (!s) return { text: 'без срока', over: false }
  const days = Math.round((new Date(s).getTime() - Date.now()) / 86400000)
  return days >= 0 ? { text: `ещё ${days} дн.`, over: false } : { text: `истёк ${-days} дн. назад`, over: true }
}
