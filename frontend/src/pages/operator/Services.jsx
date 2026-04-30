import { useState, useEffect } from 'react'
import OperatorLayout from '../../components/layout/OperatorLayout'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import { PageHeader, EmptyState } from '../../components/ui/Helpers'
import { Badge } from '../../components/ui/Badge'
import { operatorService } from '../../api/operatorService'
import { useApp } from '../../context/AppContext'
import { BODY_TYPES } from '../../utils/constants'
import { formatDuration } from '../../utils/dateHelpers'

const EMPTY_FORM = { name: '', body_type: 'sedan', price: '', duration_min: 30, is_active: true }

export default function Services() {
  const { toast }             = useApp()
  const [services,  setServices]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editService,setEditService]=useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [deleteId,  setDeleteId]  = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  const fetchServices = async () => {
    setLoading(true)
    try {
      const data = await operatorService.getServices()
      setServices(Array.isArray(data) ? data : data.items || [])
    } catch { toast.error('Не удалось загрузить услуги') }
    finally  { setLoading(false) }
  }

  useEffect(() => { fetchServices() }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditService(null)
    setModal(true)
  }

  const openEdit = (service) => {
    setForm({
      name:         service.name,
      body_type:    service.body_type,
      price:        service.price,
      duration_min: service.duration_min,
      is_active:    service.is_active,
    })
    setEditService(service)
    setModal(true)
  }

  const set = (k) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) :
                e.target.type === 'checkbox' ? e.target.checked :
                e.target.value
    setForm((p) => ({ ...p, [k]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editService) await operatorService.updateService(editService.id, form)
      else             await operatorService.createService(form)
      toast.success(editService ? 'Услуга обновлена' : 'Услуга создана')
      setModal(false)
      fetchServices()
    } catch (err) { toast.error(err.response?.data?.detail || 'Ошибка') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await operatorService.deleteService(deleteId)
      toast.success('Услуга удалена')
      setDeleteId(null)
      fetchServices()
    } catch { toast.error('Не удалось удалить') }
    finally { setDeleting(false) }
  }

  const groupedServices = services.reduce((acc, s) => {
    if (!acc[s.body_type]) acc[s.body_type] = []
    acc[s.body_type].push(s)
    return acc
  }, {})

  return (
    <OperatorLayout>
      <PageHeader
        title="Прайс-лист услуг"
        action={<Button onClick={openCreate}>Добавить услугу</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : services.length === 0 ? (
        <EmptyState
          icon="🧼"
          title="Нет услуг"
          description="Создайте свой первый прайс-лист"
          action={<Button onClick={openCreate}>Добавить услугу</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {BODY_TYPES.map((bodyType) => {
            const items = groupedServices[bodyType.value] || []
            if (items.length === 0) return null
            return (
              <div key={bodyType.value} className="card p-5">
                <h3 className="section-title mb-4">{bodyType.label}</h3>
                <div className="flex flex-col gap-2">
                  {items.map((s) => (
                    <ServiceRow
                      key={s.id}
                      service={s}
                      onEdit={() => openEdit(s)}
                      onDelete={() => setDeleteId(s.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editService ? 'Редактировать услугу' : 'Создать услугу'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Отмена</Button>
            <Button onClick={handleSave} loading={saving}>
              {editService ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Название *"
            placeholder="Экспресс-мойка кузова"
            value={form.name}
            onChange={set('name')}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Тип кузова *" value={form.body_type} onChange={set('body_type')}>
              {BODY_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
            </Select>
            <Input
              label="Цена (₸) *"
              type="number"
              min="0"
              placeholder="3000"
              value={form.price}
              onChange={set('price')}
              required
            />
          </div>
          <Input
            label="Длительность (мин) *"
            type="number"
            min="5"
            step="5"
            placeholder="30"
            value={form.duration_min}
            onChange={set('duration_min')}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4 rounded" />
            Активна (отображается клиентам)
          </label>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить услугу"
        message="Удалить эту услугу? Это действие нельзя отменить."
        confirmLabel="Удалить"
        danger
        loading={deleting}
      />
    </OperatorLayout>
  )
}

function ServiceRow({ service, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-primary-200 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-900">{service.name}</span>
          {!service.is_active && <Badge variant="gray">Скрыта</Badge>}
        </div>
        <div className="text-xs text-slate-500">
          {formatDuration(service.duration_min)}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-sm font-bold text-primary-700">
          {service.price.toLocaleString()} ₸
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>Изменить</Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={onDelete}>
          Удалить
        </Button>
      </div>
    </div>
  )
}