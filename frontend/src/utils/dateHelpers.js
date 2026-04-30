/**
 * Format ISO date string to "DD MMM YYYY" (e.g. "12 апр 2026")
 */
const RU_MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Format ISO date to "HH:MM"
 */
export function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format ISO date to "DD MMM, HH:MM"
 */
export function formatDateTime(iso) {
  if (!iso) return '—'
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

/**
 * Return YYYY-MM-DD string for a Date object
 */
export function toDateString(date = new Date()) {
  return date.toISOString().split('T')[0]
}

/**
 * Returns array of next N days as YYYY-MM-DD strings starting from today
 */
export function nextDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return toDateString(d)
  })
}

/**
 * Humanize duration in minutes → "1 ч 30 мин" or "45 мин"
 */
export function formatDuration(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} ч ${m} мин`
  if (h) return `${h} ч`
  return `${m} мин`
}