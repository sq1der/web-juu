import { useState, useEffect } from 'react'
import PublicLayout from '../../components/layout/PublicLayout'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/Helpers'
import { carService } from '../../api/carService'
import { useApp } from '../../context/AppContext'
import { BODY_TYPES } from '../../utils/constants'

const EMPTY_FORM = { brand: '', model: '', plate: '', body_type: 'sedan', color: '' }

export default function Cars() {
  const { toast }           = useApp()
  const [cars,      setCars]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editCar,   setEditCar]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [deleteId,  setDeleteId]  = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  const fetchCars = async () => {
    try {
      const data = await carService.list()
      setCars(Array.isArray(data) ? data : data.items || [])
    } catch { toast.error('Не удалось загрузить автомобили') }
    finally  { setLoading(false) }
  }

  useEffect(() => { fetchCars() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditCar(null); setModal(true) }
  const openEdit   = (car) => {
    setForm({ brand: car.brand, model: car.model, plate: car.plate, body_type: car.body_type, color: car.color || '' })
    setEditCar(car)
    setModal(true)
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editCar) await carService.update(editCar.id, form)
      else         await carService.create(form)
      toast.success(editCar ? 'Автомобиль обновлён' : 'Автомобиль добавлен')
      setModal(false)
      fetchCars()
    } catch (err) { toast.error(err.response?.data?.detail || 'Ошибка') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await carService.remove(deleteId)
      toast.success('Автомобиль удалён')
      setDeleteId(null)
      fetchCars()
    } catch { toast.error('Не удалось удалить — возможно есть активные брони') }
    finally { setDeleting(false) }
  }

  const handleSetDefault = async (id) => {
    try {
      await carService.setDefault(id)
      fetchCars()
    } catch { toast.error('Ошибка') }
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Мои автомобили</h1>
          <Button onClick={openCreate} icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }>
            Добавить авто
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : cars.length === 0 ? (
          <EmptyState icon="🚗" title="Нет автомобилей" description="Добавьте свой первый автомобиль для бронирования" action={
            <Button onClick={openCreate}>Добавить авто</Button>
          } />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onEdit={() => openEdit(car)}
                onDelete={() => setDeleteId(car.id)}
                onSetDefault={() => handleSetDefault(car.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editCar ? 'Редактировать автомобиль' : 'Добавить автомобиль'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Отмена</Button>
            <Button onClick={handleSave} loading={saving}>
              {editCar ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Марка *" placeholder="Toyota" value={form.brand} onChange={set('brand')} required />
            <Input label="Модель *" placeholder="Camry"  value={form.model} onChange={set('model')} required />
          </div>
          <Input label="Гос. номер *" placeholder="777 AB 02" value={form.plate} onChange={set('plate')} required />
          <Select label="Тип кузова *" value={form.body_type} onChange={set('body_type')}>
            {BODY_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
          </Select>
          <Input label="Цвет" placeholder="Белый" value={form.color} onChange={set('color')} />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить автомобиль"
        message="Удалить этот автомобиль? Это действие нельзя отменить."
        confirmLabel="Удалить"
        danger
        loading={deleting}
      />
    </PublicLayout>
  )
}

function CarCard({ car, onEdit, onDelete, onSetDefault }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{car.brand} {car.model}</span>
            {car.is_default && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">Основной</span>
            )}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">{car.plate}</div>
          <div className="text-xs text-slate-400 mt-1">
            {BODY_TYPES.find(b=>b.value===car.body_type)?.label}
            {car.color && ` · ${car.color}`}
          </div>
        </div>
        <div className="text-3xl">🚗</div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
        {!car.is_default && (
          <button
            onClick={onSetDefault}
            className="text-xs text-slate-500 hover:text-primary-600 transition-colors"
          >
            Сделать основным
          </button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onEdit}>Изменить</Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={onDelete}>Удалить</Button>
      </div>
    </div>
  )
}