import { useState, useEffect, useCallback } from 'react'
import OperatorLayout from '../../components/layout/OperatorLayout'
import { BookingStatusBadge, WashStatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { EmptyState, PageHeader } from '../../components/ui/Helpers'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import { Select, Textarea } from '../../components/ui/Input'
import { operatorService } from '../../api/operatorService'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useApp } from '../../context/AppContext'
import { formatDateTime } from '../../utils/dateHelpers'

const STATUS_TABS = [
  { value: '',          label: 'Все' },
  { value: 'pending',   label: 'Ожидают' },
  { value: 'confirmed', label: 'Подтверждены' },
]

export default function Dashboard() {
  const { toast }           = useApp()
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('pending')
  const [confirmId, setConfirmId] = useState(null)
  const [cancelData,setCancelData]= useState(null)
  const [reason,    setReason]    = useState('')
  const [washModal, setWashModal] = useState(null)
  const [washStatus,setWashStatus]= useState('')
  const [acting,    setActing]    = useState(false)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await operatorService.getBookings({ status: tab || undefined })
      setBookings(Array.isArray(data) ? data : data.items || [])
    } catch { toast.error('Не удалось загрузить брони') }
    finally  { setLoading(false) }
  }, [tab, toast])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // WebSocket for real-time bookings
  const handleWsMessage = useCallback((payload) => {
    if (payload.type === 'new_booking') {
      toast.info('Новая бронь!')
      fetchBookings()
    }
  }, [fetchBookings, toast])
  useWebSocket('/ws/operator', handleWsMessage, true)

  const handleConfirm = async () => {
    setActing(true)
    try {
      await operatorService.confirmBooking(confirmId)
      toast.success('Бронь подтверждена')
      setConfirmId(null)
      fetchBookings()
    } catch { toast.error('Ошибка') }
    finally  { setActing(false) }
  }

  const handleCancel = async () => {
    setActing(true)
    try {
      await operatorService.cancelBooking(cancelData.id, reason || 'Отменено оператором')
      toast.success('Бронь отменена')
      setCancelData(null)
      setReason('')
      fetchBookings()
    } catch { toast.error('Ошибка') }
    finally  { setActing(false) }
  }

  const handleWashStatus = async () => {
    setActing(true)
    try {
      await operatorService.updateWashStatus(washModal.id, washStatus)
      toast.success('Статус мойки обновлён')
      setWashModal(null)
      fetchBookings()
    } catch { toast.error('Ошибка') }
    finally  { setActing(false) }
  }

  return (
    <OperatorLayout>
      <PageHeader title="Бронирования" />

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
        <EmptyState icon="📋" title="Нет бронирований" description="Брони появятся здесь, когда клиенты запишутся" />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              onConfirm={() => setConfirmId(b.id)}
              onCancel={() => setCancelData(b)}
              onUpdateWash={() => { setWashModal(b); setWashStatus(b.wash_status || 'waiting') }}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirm}
        title="Подтвердить бронь"
        message="Подтвердить это бронирование?"
        confirmLabel="Подтвердить"
        loading={acting}
      />

      <Modal
        isOpen={!!cancelData}
        onClose={() => { setCancelData(null); setReason('') }}
        title="Отменить бронь"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelData(null)}>Закрыть</Button>
            <Button variant="danger" onClick={handleCancel} loading={acting}>Отменить бронь</Button>
          </>
        }
      >
        <Textarea
          label="Причина отмены"
          placeholder="Укажите причину..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>

      <Modal
        isOpen={!!washModal}
        onClose={() => setWashModal(null)}
        title="Обновить статус мойки"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWashModal(null)}>Закрыть</Button>
            <Button onClick={handleWashStatus} loading={acting}>Сохранить</Button>
          </>
        }
      >
        <Select label="Статус" value={washStatus} onChange={(e) => setWashStatus(e.target.value)}>
          <option value="waiting">Ожидает мойки</option>
          <option value="in_progress">Моется</option>
          <option value="done">Готово</option>
        </Select>
      </Modal>
    </OperatorLayout>
  )
}

function BookingRow({ booking, onConfirm, onCancel, onUpdateWash }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <BookingStatusBadge status={booking.status} />
          {booking.wash_status && <WashStatusBadge status={booking.wash_status} />}
        </div>
        <div className="text-sm font-semibold text-slate-900 mb-1">
          {booking.service?.name} · {booking.car?.brand} {booking.car?.model} ({booking.car?.plate})
        </div>
        <div className="text-xs text-slate-500">
          {formatDateTime(booking.slot?.starts_at)} · Клиент: {booking.user?.name}
        </div>
        {booking.service?.price && (
          <div className="text-xs text-primary-600 font-medium mt-1">
            {booking.service.price.toLocaleString()} ₸
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        {booking.status === 'pending' && (
          <>
            <Button size="sm" onClick={onConfirm}>Подтвердить</Button>
            <Button size="sm" variant="danger" onClick={onCancel}>Отменить</Button>
          </>
        )}
        {booking.status === 'confirmed' && (
          <>
            <Button size="sm" variant="secondary" onClick={onUpdateWash}>Статус мойки</Button>
            <Button size="sm" variant="danger" onClick={onCancel}>Отменить</Button>
          </>
        )}
      </div>
    </div>
  )
}