import api from './axios'

export const operatorService = {
  // Carwash profile
  async getCarwash() {
    const { data } = await api.get('/operator/carwash')
    return data
  },
  async updateCarwash(payload) {
    const { data } = await api.patch('/operator/carwash', payload)
    return data
  },

  // Bookings
  async getBookings({ status, page = 1, limit = 20 } = {}) {
    const { data } = await api.get('/operator/bookings', {
      params: { status, page, limit },
    })
    return data
  },
  async confirmBooking(id) {
    const { data } = await api.post(`/operator/bookings/${id}/confirm`)
    return data
  },
  async cancelBooking(id, reason) {
    const { data } = await api.post(`/operator/bookings/${id}/cancel`, { reason })
    return data
  },
  async updateWashStatus(id, wash_status) {
    const { data } = await api.patch(`/operator/bookings/${id}/washstatus`, { wash_status })
    return data
  },

  // Slots
  async getSlots(date) {
    const { data } = await api.get('/operator/slots', { params: { date } })
    return data
  },
  async createSlot(payload) {
    const formattedPayload = {
      slots: [payload]
    };

    const { data } = await api.post('/operator/slots', formattedPayload)
    return data
  },
  async updateSlot(id, payload) {
    const { data } = await api.patch(`/operator/slots/${id}`, payload)
    return data
  },
  async deleteSlot(id) {
    await api.delete(`/operator/slots/${id}`)
  },

  // Services
  async getServices() {
    const { data } = await api.get('/operator/services')
    return data
  },
  async createService(payload) {
    const { data } = await api.post('/operator/services', payload)
    return data
  },
  async updateService(id, payload) {
    const { data } = await api.patch(`/operator/services/${id}`, payload)
    return data
  },
  async deleteService(id) {
    await api.delete(`/operator/services/${id}`)
  },

  // Stats
  async getStats() {
    const { data } = await api.get('/operator/stats')
    return data
  },
}