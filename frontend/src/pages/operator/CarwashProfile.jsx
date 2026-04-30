import { useState, useEffect } from 'react'
import OperatorLayout from '../../components/layout/OperatorLayout'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { PageHeader, ErrorMessage } from '../../components/ui/Helpers'
import { StarRating } from '../../components/ui/Badge'
import { operatorService } from '../../api/operatorService'
import { useApp } from '../../context/AppContext'

const DAYS = [
  { key: 'mon', label: 'Понедельник' },
  { key: 'tue', label: 'Вторник' },
  { key: 'wed', label: 'Среда' },
  { key: 'thu', label: 'Четверг' },
  { key: 'fri', label: 'Пятница' },
  { key: 'sat', label: 'Суббота' },
  { key: 'sun', label: 'Воскресенье' },
]

export default function CarwashProfile() {
  const { toast }         = useApp()
  const [carwash,  setCarwash]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  const [form, setForm] = useState({
    name:          '',
    address:       '',
    lat:           '',
    lng:           '',
    is_active:     true,
    working_hours: {},
  })

  const fetchCarwash = async () => {
    try {
      const data = await operatorService.getCarwash()
      setCarwash(data)
      setForm({
        name:          data.name || '',
        address:       data.address || '',
        lat:           data.lat || '',
        lng:           data.lng || '',
        is_active:     data.is_active ?? true,
        working_hours: data.working_hours || {},
      })
    } catch (err) {
      setError('Не удалось загрузить данные мойки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCarwash() }, [])

  const set = (k) => (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) :
                e.target.type === 'checkbox' ? e.target.checked :
                e.target.value
    setForm((p) => ({ ...p, [k]: val }))
  }

  const setHours = (day, value) => {
    setForm((p) => ({
      ...p,
      working_hours: { ...p.working_hours, [day]: value },
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await operatorService.updateCarwash(form)
      toast.success('Профиль мойки обновлён')
      fetchCarwash()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <OperatorLayout>
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </OperatorLayout>
  )

  return (
    <OperatorLayout>
      <PageHeader title="Моя мойка" />

      {/* Stats Card */}
      {carwash && (
        <div className="card p-6 mb-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-sky-400 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">{carwash.name}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <StarRating value={carwash.rating} />
                <span>{carwash.rating.toFixed(1)} ({carwash.reviews_count} отзывов)</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                ${carwash.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {carwash.is_active ? 'Активна' : 'Неактивна'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      <div className="card p-6">
        <h3 className="section-title mb-5">Редактировать профиль</h3>

        <ErrorMessage message={error} />

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <Input
            label="Название мойки *"
            placeholder="Автомойка 'Чистота'"
            value={form.name}
            onChange={set('name')}
            required
          />

          <Textarea
            label="Адрес *"
            placeholder="г. Астана, ул. Кабанбай Батыра 15"
            value={form.address}
            onChange={set('address')}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Широта (lat) *"
              type="number"
              step="any"
              placeholder="51.1694"
              value={form.lat}
              onChange={set('lat')}
              required
            />
            <Input
              label="Долгота (lng) *"
              type="number"
              step="any"
              placeholder="71.4491"
              value={form.lng}
              onChange={set('lng')}
              required
            />
          </div>

          <div className="divider" />

          <h4 className="section-title">Режим работы</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS.map((day) => (
              <div key={day.key} className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 w-28">{day.label}</span>
                <Input
                  placeholder="09:00-21:00"
                  value={form.working_hours[day.key] || ''}
                  onChange={(e) => setHours(day.key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Формат: ЧЧ:ММ-ЧЧ:ММ (например, 09:00-21:00). Оставьте пустым для выходного.
          </p>

          <div className="divider" />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={set('is_active')}
              className="w-4 h-4 rounded"
            />
            Активна (отображается в поиске клиентов)
          </label>

          <Button type="submit" loading={saving} className="self-start">
            Сохранить изменения
          </Button>
        </form>
      </div>
    </OperatorLayout>
  )
}