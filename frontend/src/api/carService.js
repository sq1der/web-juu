import api from './axios'

export const carService = {
  async list() {
    const { data } = await api.get('/cars')
    return data
  },

  async create(payload) {
    const { data } = await api.post('/cars', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await api.patch(`/cars/${id}`, payload)
    return data
  },

  async remove(id) {
    const { data } = await api.delete(`/cars/${id}`)
    return data
  },

  async setDefault(id) {
    const { data } = await api.patch(`/cars/${id}/default`)
    return data
  },
}