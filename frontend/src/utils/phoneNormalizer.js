/**
 * Normalizes a Kazakh/Russian phone number to +7XXXXXXXXXX format.
 */
export function normalizePhone(raw = '') {
  // Remove all non-digit chars
  const digits = raw.replace(/\D/g, '')

  if (!digits) return ''

  // Handle 87XXXXXXXXXX → replace leading 8 with 7
  if (digits.length === 11 && digits.startsWith('8')) {
    return '+7' + digits.slice(1)
  }

  // Handle 77XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('7')) {
    return '+' + digits
  }

  // Handle +7XXXXXXXXXX (digits only = 11 starting with 7)
  if (digits.length === 10) {
    return '+7' + digits
  }

  // Return best effort
  return '+' + digits
}

/**
 * Returns true if the string looks like a phone (no @).
 */
export function isPhone(identifier = '') {
  return !identifier.includes('@')
}

/**
 * Format phone for display: +7 (777) 123-45-67
 */
export function formatPhone(phone = '') {
  const normalized = normalizePhone(phone)
  if (!normalized.startsWith('+7') || normalized.length !== 12) return normalized
  const d = normalized.slice(2)
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`
}