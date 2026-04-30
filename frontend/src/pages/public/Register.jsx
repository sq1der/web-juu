import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Input, { Select } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { ErrorMessage } from '../../components/ui/Helpers'

export default function Register() {
  const { register, error } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]     = useState({ name: '', phone: '', email: '', password: '', role: 'client' })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.phone && !form.email) return alert('Укажите телефон или email')
    setLoading(true)
    try {
      const user = await register(form)
      if (user?.role === 'owner') navigate('/operator/dashboard', { replace: true })
      else navigate('/', { replace: true })
    } catch {
      // error in context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-sky-400 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">WashBook</h1>
          <p className="text-sm text-slate-500 mt-1">Создайте аккаунт</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ErrorMessage message={error} />

            <Input
              label="Имя *"
              type="text"
              placeholder="Иван Иванов"
              value={form.name}
              onChange={set('name')}
              required
            />

            <Input
              label="Телефон"
              type="tel"
              placeholder="+7 777 123 45 67"
              value={form.phone}
              onChange={set('phone')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={set('email')}
            />

            <p className="text-xs text-slate-400 -mt-2">
              Укажите телефон или email (или оба)
            </p>

            <Input
              label="Пароль *"
              type="password"
              placeholder="Минимум 6 символов"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
            />

            <Select label="Роль *" value={form.role} onChange={set('role')} required>
              <option value="client">Клиент — записываюсь на мойку</option>
              <option value="owner">Владелец — управляю мойкой</option>
            </Select>

            <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
              Зарегистрироваться
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}