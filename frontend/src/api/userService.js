import api from './axios'
import { normalizePhone } from '../utils/phoneNormalizer'

export const userService = {
  async updateProfile({ name, email, phone }) {
    const payload = {}
    if (name)  payload.name  = name
    if (email) payload.email = email
    if (phone) payload.phone = normalizePhone(phone)
    const { data } = await api.patch('/users/me', payload)
    return data
  },

  async changePassword({ old_password, new_password }) {
    const { data } = await api.patch('/users/me/password', { old_password, new_password })
    return data
  },
}