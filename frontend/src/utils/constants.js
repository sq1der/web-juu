export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
export const WS_BASE_URL  = import.meta.env.VITE_WS_URL  || 'ws://localhost:8000'

export const BODY_TYPES = [
  { value: 'sedan',     label: 'Седан' },
  { value: 'hatchback', label: 'Хэтчбек' },
  { value: 'suv',       label: 'Внедорожник' },
  { value: 'minivan',   label: 'Минивэн' },
  { value: 'truck',     label: 'Грузовик' },
]

export const BOOKING_STATUSES = {
  pending:   { label: 'Ожидает',   cls: 'badge-orange' },
  confirmed: { label: 'Подтверждено', cls: 'badge-green' },
  cancelled: { label: 'Отменено',  cls: 'badge-red' },
}

export const WASH_STATUSES = {
  waiting:     { label: 'Ожидает мойки', cls: 'badge-blue' },
  in_progress: { label: 'Моется',        cls: 'badge-orange' },
  done:        { label: 'Готово',        cls: 'badge-green' },
}

export const ROLES = {
  client: 'client',
  owner:  'owner',
  admin:  'admin',
}

export const DEFAULT_SEARCH_RADIUS = 5   // km
export const MAX_SEARCH_RADIUS     = 50  // km