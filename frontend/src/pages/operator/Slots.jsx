import { useState, useEffect } from 'react'
import OperatorLayout from '../../components/layout/OperatorLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import { PageHeader, EmptyState } from '../../components/ui/Helpers'
import { operatorService } from '../../api/operatorService'
import { useApp } from '../../context/AppContext'
import { nextDays, formatTime, toDateString } from '../../utils/dateHelpers'

const EMPTY_FORM = { starts_at: '', capacity: 1 }

export default function Slots() {
  const { toast }           = useApp()
  const [slots,     setSlots]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selDate,   setSelDate]   = useState(toDateString())
  const [modal,     setModal]     = useState(false)
  const [editSlot,  setEditSlot]  = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [deleteId,  setDeleteId]  = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  const fetchSlots = async () => {
    setLoading(true)
    try {
      const data = await operatorService.getSlots(selDate)
      setSlots(Array.isArray(data) ? data : data.items || [])
    } catch { toast.error('Не удалось загрузить слоты') }
    finally  { setLoading(false) }
  }

  useEffect(() => { fetchSlots() }, [selDate])

  const openCreate = () => {
    const baseTime = `${selDate}T09:00`
    setForm({ starts_at: baseTime, capacity: 1 })
    setEditSlot(null)
    setModal(true)
  }

  const openEdit = (slot) => {
    setForm({ starts_at: slot.starts_at.slice(0, 16), capacity: slot.capacity })
    setEditSlot(slot)
    setModal(true)
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: k === 'capacity' ? Number(e.target.value) : e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editSlot) await operatorService.updateSlot(editSlot.id, form)
      else          await operatorService.createSlot(form)
      toast.success(editSlot ? 'Слот обновлён' : 'Слот создан')
      setModal(false)
      fetchSlots()
    } catch (err) { toast.error(err.response?.data?.detail || 'Ошибка') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await operatorService.deleteSlot(deleteId)
      toast.success('Слот удалён')
      setDeleteId(null)
      fetchSlots()
    } catch { toast.error('Не удалось удалить — возможно есть брони') }
    finally { setDeleting(false) }
  }

  const sortedSlots = [...slots].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))

  return (
    <OperatorLayout>
      <PageHeader
        title="Расписание слотов"
        action={<Button onClick={openCreate}>Создать слот</Button>}
      />

      {/* Date picker */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {nextDays(14).map((d) => (
          <button
            key={d}
            onClick={() => setSelDate(d)}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors
              ${selDate === d ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
          >
            {new Date(d).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : sortedSlots.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Нет слотов на эту дату"
          description="Создайте слоты для приёма клиентов"
          action={<Button onClick={openCreate}>Создать слот</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onEdit={() => openEdit(slot)}
              onDelete={() => setDeleteId(slot.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editSlot ? 'Редактировать слот' : 'Создать слот'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Отмена</Button>
            <Button onClick={handleSave} loading={saving}>
              {editSlot ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Дата и время начала *"
            type="datetime-local"
            value={form.starts_at}
            onChange={set('starts_at')}
            required
          />
          <Input
            label="Вместимость (кол-во машин) *"
            type="number"
            min="1"
            value={form.capacity}
            onChange={set('capacity')}
            required
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить слот"
        message="Удалить этот слот? Это действие нельзя отменить."
        confirmLabel="Удалить"
        danger
        loading={deleting}
      />
    </OperatorLayout>
  )
}

function SlotCard({ slot, onEdit, onDelete }) {
  const availability = slot.capacity - slot.booked
  const isFull       = availability === 0

  return (
    <div className={`card p-4 flex flex-col gap-3 ${isFull ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-slate-900">
          {formatTime(slot.starts_at)}
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full
          ${isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {availability} / {slot.capacity}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
        <Button variant="ghost" size="sm" onClick={onEdit}>Изменить</Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={onDelete}>
          Удалить
        </Button>
      </div>
    </div>
  )
}