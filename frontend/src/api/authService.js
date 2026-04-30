import api from './axios'
import { normalizePhone, isPhone } from '../utils/phoneNormalizer'

export const authService = {
  async register({ phone, email, password, name, role }) {
    const payload = { password, name, role }
    if (phone) payload.phone = normalizePhone(phone)
    if (email) payload.email = email
    const { data } = await api.post('/auth/register', payload)
    return data
  },

  async login({ identifier, password }) {
    const normalized = isPhone(identifier) ? normalizePhone(identifier) : identifier
    const { data } = await api.post('/auth/login', { identifier: normalized, password })
    // Store tokens
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return data
  },

  async refresh() {
    const refresh_token = localStorage.getItem('refresh_token')
    const { data } = await api.post('/auth/refresh', { refresh_token })
    localStorage.setItem('access_token', data.access_token)
    return data
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data
  },

  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },
}