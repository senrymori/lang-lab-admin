// Dates as the journal writes them: «23 окт, 02:41», «8 дек», «7 ноября»; no dots after the month.
const SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const LONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const two = (n: number) => String(n).padStart(2, '0')

export const fmtDate = (s: string | Date | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.getDate()} ${SHORT[d.getMonth()]}`
}
export const fmtDateTime = (s: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return `${fmtDate(d)}, ${two(d.getHours())}:${two(d.getMinutes())}`
}
export const fmtDayLong = (d: Date) => `${d.getDate()} ${LONG[d.getMonth()]}`
export const fmtDayFull = (d: Date) => `${fmtDayLong(d)} ${d.getFullYear()}`
export const usd = (n: number) => `$${n.toFixed(2)}`
// a single day's line can be a fraction of a cent: shown, not rounded to $0.00
export const usdFine = (n: number) => (n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : usd(n))

/** plural(5, ['урок', 'урока', 'уроков']) → 'уроков' */
export const plural = (n: number, [one, few, many]: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
export const lessons = (n: number) => `${n} ${plural(n, ['урок', 'урока', 'уроков'])}`
export const days = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`
