import api from './axios'

export const carwashService = {
  /**
   * Search carwashes by geolocation
   * @param {Object} params - { lat, lng, radius, rating_min, page, limit }
   */
  async search(params = {}) {
    const { data } = await api.get('/carwashes', { params })
    return data
  },

  async getById(id) {
    const { data } = await api.get(`/carwashes/${id}`)
    return data
  },

  async getServices(id, { body_type } = {}) {
    const { data } = await api.get(`/carwashes/${id}/services`, {
      params: body_type ? { body_type } : {},
    })
    return data
  },

  async getSlots(id, date) {
    const { data } = await api.get(`/carwashes/${id}/slots`, {
      params: { date },
    })
    return data
  },

  async getReviews(id, { page = 1, limit = 10 } = {}) {
    const { data } = await api.get(`/carwashes/${id}/reviews`, {
      params: { page, limit },
    })
    return data
  },
}