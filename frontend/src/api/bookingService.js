import api from './axios'

export const bookingService = {
  async list({ status, page = 1, limit = 10 } = {}) {
    const { data } = await api.get('/bookings', {
      params: { status, page, limit },
    })
    return data
  },

  async getById(id) {
    const { data } = await api.get(`/bookings/${id}`)
    return data
  },

  async create({ slot_id, service_id, car_id }) {
    const { data } = await api.post('/bookings', { slot_id, service_id, car_id })
    return data
  },

  async cancel(id) {
    const { data } = await api.post(`/bookings/${id}/cancel`)
    return data
  },
}