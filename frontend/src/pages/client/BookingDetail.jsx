import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import { BookingStatusBadge, WashStatusBadge, StarRating } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Input'
import { bookingService } from '../../api/bookingService'
import { reviewService } from '../../api/reviewService'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useApp } from '../../context/AppContext'
import { formatDateTime, formatDuration } from '../../utils/dateHelpers'

const WASH_STEPS = [
  { key: 'waiting',     label: 'Ожидание',   icon: '⏳' },
  { key: 'in_progress', label: 'Мойка',      icon: '🚿' },
  { key: 'done',        label: 'Готово',     icon: '✅' },
]

export default function BookingDetail() {
  const { id }        = useParams()
  const { toast }     = useApp()

  const [booking,  setBooking]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [revModal, setRevModal] = useState(false)
  const [rating,   setRating]   = useState(5)
  const [comment,  setComment]  = useState('')
  const [submitting,setSubmitting]=useState(false)

  const fetchBooking = useCallback(async () => {
    try {
      const data = await bookingService.getById(id)
      setBooking(data)
    } catch { toast.error('Не удалось загрузить бронь') }
    finally  { setLoading(false) }
  }, [id, toast])

  useEffect(() => { fetchBooking() }, [fetchBooking])

  // Real-time wash_status via WebSocket
  const handleWsMessage = useCallback((payload) => {
    if (payload.wash_status) {
      setBooking((prev) => prev ? { ...prev, wash_status: payload.wash_status } : prev)
    }
  }, [])
  useWebSocket(`/ws/booking/${id}`, handleWsMessage, !!id)

  const submitReview = async () => {
    setSubmitting(true)
    try {
      await reviewService.create({ booking_id: id, rating, comment })
      toast.success('Отзыв отправлен!')
      setRevModal(false)
      fetchBooking()
    } catch { toast.error('Не удалось отправить отзыв') }
    finally  { setSubmitting(false) }
  }

  if (loading) return <PublicLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></PublicLayout>
  if (!booking) return <PublicLayout><p className="text-center py-20 text-slate-400">Бронь не найдена</p></PublicLayout>

  const washStep = WASH_STEPS.findIndex((s) => s.key === booking.wash_status)

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="page-title mb-6">Бронирование</h1>

        {/* Status Card */}
        <div className="card p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <BookingStatusBadge status={booking.status} />
            {booking.wash_status && <WashStatusBadge status={booking.wash_status} />}
          </div>

          {/* Wash progress stepper */}
          {booking.wash_status && (
            <div className="flex items-center gap-2 mb-5">
              {WASH_STEPS.map((step, i) => (
                <div key={step.key} className="flex items-center gap-2 flex-1">
                  <div className={`flex flex-col items-center gap-1 flex-1`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all
                      ${i <= washStep ? 'bg-primary-100 scale-110' : 'bg-slate-100'}`}>
                      {step.icon}
                    </div>
                    <span className={`text-xs font-medium ${i <= washStep ? 'text-primary-700' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < WASH_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mb-4 rounded ${i < washStep ? 'bg-primary-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailRow label="Время" value={formatDateTime(booking.slot?.starts_at)} />
            <DetailRow label="Услуга" value={booking.service?.name} />
            <DetailRow label="Стоимость" value={booking.service?.price ? `${booking.service.price.toLocaleString()} ₸` : '—'} />
            <DetailRow label="Длительность" value={formatDuration(booking.service?.duration_min)} />
            <DetailRow label="Автомобиль" value={booking.car ? `${booking.car.brand} ${booking.car.model} · ${booking.car.plate}` : '—'} />
            <DetailRow label="Создано" value={formatDateTime(booking.created_at)} />
          </div>

          {booking.cancel_reason && (
            <div className="mt-4 bg-red-50 rounded-xl p-3 text-sm text-red-700">
              <strong>Причина отмены:</strong> {booking.cancel_reason}
            </div>
          )}
        </div>

        {/* Review button */}
        {booking.status === 'confirmed' && booking.wash_status === 'done' && (
          <Button
            onClick={() => setRevModal(true)}
            variant="secondary"
            className="w-full"
            icon={<span>★</span>}
          >
            Оставить отзыв
          </Button>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={revModal}
        onClose={() => setRevModal(false)}
        title="Ваш отзыв"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevModal(false)}>Отмена</Button>
            <Button onClick={submitReview} loading={submitting}>Отправить</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Оценка</label>
            <div className="flex gap-2 mt-1">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`text-2xl transition-transform hover:scale-110 ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Комментарий (необязательно)"
            placeholder="Расскажите о вашем опыте..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </Modal>
    </PublicLayout>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-slate-800 font-medium">{value || '—'}</div>
    </div>
  )
}