import api from './axios'

export const reviewService = {
  async create({ booking_id, rating, comment }) {
    const { data } = await api.post('/reviews', { booking_id, rating, comment })
    return data
  },

  async remove(id) {
    await api.delete(`/reviews/${id}`)
  },
}

export const favoriteService = {
  async list() {
    const { data } = await api.get('/favorites')
    return data
  },

  async add(carwash_id) {
    const { data } = await api.post(`/favorites/${carwash_id}`)
    return data
  },

  async remove(carwash_id) {
    await api.delete(`/favorites/${carwash_id}`)
  },
}