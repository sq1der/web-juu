import { useState, useEffect } from 'react'
import PublicLayout from '../../components/layout/PublicLayout'
import { BookingStatusBadge, WashStatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/Helpers'
import { ConfirmModal } from '../../components/ui/Modal'
import { bookingService } from '../../api/bookingService'
import { useApp } from '../../context/AppContext'
import { formatDateTime, formatDuration } from '../../utils/dateHelpers'
import { Link } from 'react-router-dom'

const STATUS_TABS = [
  { value: '', label: 'Все' },
  { value: 'pending',   label: 'Ожидает' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'cancelled', label: 'Отменено' },
]

export default function Bookings() {
  const { toast }         = useApp()
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('')
  const [cancelId,  setCancelId]  = useState(null)
  const [cancelling,setCancelling]= useState(false)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const data = await bookingService.list({ status: tab || undefined })
      setBookings(Array.isArray(data) ? data : data.items || [])
    } catch { toast.error('Не удалось загрузить брони') }
    finally   { setLoading(false) }
  }

  useEffect(() => { fetchBookings() }, [tab])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await bookingService.cancel(cancelId)
      toast.success('Бронь отменена')
      setCancelId(null)
      fetchBookings()
    } catch { toast.error('Ошибка при отмене') }
    finally  { setCancelling(false) }
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Мои бронирования</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 w-fit shadow-card">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t.value ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : bookings.length === 0 ? (
          <EmptyState icon="📋" title="Нет бронирований" description="Найдите мойку и запишитесь" action={
            <Link to="/"><Button>Найти мойку</Button></Link>
          } />
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onCancel={() => setCancelId(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title="Отменить бронь"
        message="Вы уверены, что хотите отменить это бронирование?"
        confirmLabel="Отменить бронь"
        danger
        loading={cancelling}
      />
    </PublicLayout>
  )
}

function BookingRow({ booking, onCancel }) {
  return (
    <Link to={`/bookings/${booking.id}`}>
      <div className="card-hover p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900 truncate">
              {booking.service?.name || 'Услуга'}
            </span>
            <BookingStatusBadge status={booking.status} />
            {booking.wash_status && <WashStatusBadge status={booking.wash_status} />}
          </div>
          <div className="text-xs text-slate-500">
            {formatDateTime(booking.slot?.starts_at)} · {booking.car?.brand} {booking.car?.model}
          </div>
          {booking.service && (
            <div className="text-xs text-primary-600 font-medium mt-1">
              {booking.service.price?.toLocaleString()} ₸ · {formatDuration(booking.service.duration_min)}
            </div>
          )}
        </div>

        {booking.status === 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-50 shrink-0"
            onClick={(e) => { e.preventDefault(); onCancel() }}
          >
            Отменить
          </Button>
        )}
      </div>
    </Link>
  )
}