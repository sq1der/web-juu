import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { StarRating, BookingStatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/Helpers'
import Modal from '../../components/ui/Modal'
import { Select } from '../../components/ui/Input'
import { carwashService } from '../../api/carwashService'
import { bookingService } from '../../api/bookingService'
import { carService } from '../../api/carService'
import { favoriteService } from '../../api/reviewService'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { formatDateTime, formatDuration, nextDays } from '../../utils/dateHelpers'
import { BODY_TYPES } from '../../utils/constants'

export default function CarwashDetail() {
  const { id }               = useParams()
  const navigate             = useNavigate()
  const { isLoggedIn, isClient } = useAuth()
  const { toast }            = useApp()

  const [carwash,   setCarwash]   = useState(null)
  const [services,  setServices]  = useState([])
  const [slots,     setSlots]     = useState([])
  const [reviews,   setReviews]   = useState([])
  const [cars,      setCars]      = useState([])
  const [isFav,     setIsFav]     = useState(false)
  const [loading,   setLoading]   = useState(true)

  const [bodyType,  setBodyType]  = useState('')
  const [selDate,   setSelDate]   = useState(nextDays(1)[0])
  const [selSlot,   setSelSlot]   = useState(null)
  const [selService,setSelService]= useState(null)
  const [selCar,    setSelCar]    = useState('')
  const [bookModal, setBookModal] = useState(false)
  const [bookLoading,setBookLoading]=useState(false)

  useEffect(() => {
    Promise.all([
      carwashService.getById(id),
      carwashService.getReviews(id),
    ]).then(([cw, rev]) => {
      setCarwash(cw)
      setReviews(Array.isArray(rev) ? rev : rev.items || [])
      setLoading(false)
    }).catch(() => { toast.error('Не удалось загрузить мойку'); setLoading(false) })

    if (isClient) {
      carService.list().then(setCars).catch(() => {})
      favoriteService.list()
        .then((favs) => setIsFav(favs.some((f) => f.id === id)))
        .catch(() => {})
    }
  }, [id, isClient, toast])

  useEffect(() => {
    if (!id || !selDate) return
    carwashService.getSlots(id, selDate)
      .then((data) => setSlots(Array.isArray(data) ? data : data.items || []))
      .catch(() => {})
  }, [id, selDate])

  useEffect(() => {
    if (!id) return
    carwashService.getServices(id, bodyType ? { body_type: bodyType } : {})
      .then((data) => setServices(Array.isArray(data) ? data : data.items || []))
      .catch(() => {})
  }, [id, bodyType])

  const toggleFav = async () => {
    if (!isLoggedIn) { toast.info('Войдите в аккаунт'); return }
    try {
      if (isFav) { await favoriteService.remove(id); setIsFav(false) }
      else       { await favoriteService.add(id);    setIsFav(true)  }
    } catch { toast.error('Ошибка') }
  }

  const handleBook = async () => {
    if (!selSlot || !selService || !selCar) return toast.error('Выберите слот, услугу и автомобиль')
    setBookLoading(true)
    try {
      await bookingService.create({ slot_id: selSlot.id, service_id: selService.id, car_id: selCar })
      toast.success('Бронирование создано!')
      setBookModal(false)
      navigate('/bookings')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка бронирования')
    } finally {
      setBookLoading(false)
    }
  }

  if (loading) return (
    <PublicLayout>
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </PublicLayout>
  )

  if (!carwash) return (
    <PublicLayout>
      <EmptyState icon="🔍" title="Мойка не найдена" />
    </PublicLayout>
  )

  const availableSlots = slots.filter((s) => s.booked < s.capacity)

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">{carwash.name}</h1>
              <p className="text-slate-500 text-sm mt-1">{carwash.address}</p>
              <div className="flex items-center gap-3 mt-3">
                <StarRating value={carwash.rating} size="md" />
                <span className="text-sm text-slate-500">{carwash.rating.toFixed(1)} ({carwash.reviews_count} отзывов)</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={toggleFav}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors
                  ${isFav ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-200 hover:text-rose-400'}`}
              >
                <svg className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isFav ? 'В избранном' : 'В избранное'}
              </button>

              {isClient && (
                <Button onClick={() => setBookModal(true)} size="lg">
                  Записаться
                </Button>
              )}
              {!isLoggedIn && (
                <Button onClick={() => navigate('/login')}>
                  Войдите для записи
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Services */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Услуги</h2>
              <Select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className="w-40"
              >
                <option value="">Все кузова</option>
                {BODY_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>{bt.label}</option>
                ))}
              </Select>
            </div>

            {services.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Услуги не добавлены</p>
            ) : (
              <div className="flex flex-col gap-2">
                {services.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer
                    ${selService?.id === s.id ? 'border-primary-400 bg-primary-50' : 'border-slate-100 hover:border-primary-200'}`}
                    onClick={() => setSelService(selService?.id === s.id ? null : s)}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-800">{s.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatDuration(s.duration_min)} · {BODY_TYPES.find(b=>b.value===s.body_type)?.label}</div>
                    </div>
                    <div className="text-sm font-bold text-primary-700">{s.price.toLocaleString()} ₸</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slots */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Доступные слоты</h2>

            {!isLoggedIn ? (
              <p className="text-sm text-slate-400 text-center py-6">Войдите чтобы увидеть слоты</p>
            ) : (
              <>
                {/* Date picker */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
                  {nextDays(7).map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelDate(d)}
                      className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-colors
                        ${selDate === d ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
                    >
                      {new Date(d).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </button>
                  ))}
                </div>

                {availableSlots.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Нет свободных слотов</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelSlot(selSlot?.id === slot.id ? null : slot)}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-colors
                          ${selSlot?.id === slot.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-700 border-slate-200 hover:border-primary-300'}`}
                      >
                        {formatDateTime(slot.starts_at).split(',')[1]?.trim() || ''}
                        <div className="text-[10px] mt-0.5 opacity-70">
                          {slot.capacity - slot.booked} мест
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="card p-5 mt-6">
          <h2 className="section-title mb-4">Отзывы</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Пока нет отзывов</p>
          ) : (
            <div className="flex flex-col gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating value={r.rating} />
                    <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-slate-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={bookModal}
        onClose={() => setBookModal(false)}
        title="Создать бронирование"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBookModal(false)}>Отмена</Button>
            <Button onClick={handleBook} loading={bookLoading}>Забронировать</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {selSlot && (
            <div className="bg-primary-50 rounded-xl p-3 text-sm text-primary-700">
              <strong>Время:</strong> {formatDateTime(selSlot.starts_at)}
            </div>
          )}
          {selService && (
            <div className="bg-primary-50 rounded-xl p-3 text-sm text-primary-700">
              <strong>Услуга:</strong> {selService.name} — {selService.price.toLocaleString()} ₸
            </div>
          )}
          {!selSlot || !selService ? (
            <p className="text-sm text-slate-500">Выберите слот и услугу на странице мойки</p>
          ) : null}

          <Select
            label="Автомобиль"
            value={selCar}
            onChange={(e) => setSelCar(e.target.value)}
            required
          >
            <option value="">Выберите автомобиль</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.model} · {c.plate}
              </option>
            ))}
          </Select>

          {cars.length === 0 && (
            <p className="text-xs text-slate-400">
              Нет добавленных автомобилей.{' '}
              <a href="/cars" className="text-primary-600 underline">Добавить авто</a>
            </p>
          )}
        </div>
      </Modal>
    </PublicLayout>
  )
}