import { BOOKING_STATUSES, WASH_STATUSES } from '../../utils/constants'

export function Badge({ children, variant = 'gray', className = '' }) {
  const cls = {
    blue:   'badge-blue',
    green:  'badge-green',
    orange: 'badge-orange',
    red:    'badge-red',
    gray:   'badge-gray',
  }
  return <span className={`${cls[variant] || 'badge-gray'} ${className}`}>{children}</span>
}

export function BookingStatusBadge({ status }) {
  const s = BOOKING_STATUSES[status]
  if (!s) return <Badge>{status}</Badge>
  const variantMap = { 'badge-orange': 'orange', 'badge-green': 'green', 'badge-red': 'red', 'badge-blue': 'blue', 'badge-gray': 'gray' }
  return <Badge variant={variantMap[s.cls] || 'gray'}>{s.label}</Badge>
}

export function WashStatusBadge({ status }) {
  if (!status) return null
  const s = WASH_STATUSES[status]
  if (!s) return <Badge>{status}</Badge>
  const variantMap = { 'badge-orange': 'orange', 'badge-green': 'green', 'badge-red': 'red', 'badge-blue': 'blue', 'badge-gray': 'gray' }
  return <Badge variant={variantMap[s.cls] || 'gray'}>{s.label}</Badge>
}

export function StarRating({ value, max = 5, size = 'sm' }) {
  const sizeCls = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }
  return (
    <span className={`flex items-center gap-0.5 ${sizeCls[size]}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < Math.round(value) ? 'text-amber-400' : 'text-slate-200'}>★</span>
      ))}
    </span>
  )
}