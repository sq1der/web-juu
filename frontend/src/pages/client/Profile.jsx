import { useState } from 'react'
import PublicLayout from '../../components/layout/PublicLayout'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { userService } from '../../api/userService'
import { authService } from '../../api/authService'
import { formatPhone } from '../../utils/phoneNormalizer'

export default function Profile() {
  const { user, setUser } = useAuth()
  const { toast }         = useApp()

  const [profileForm, setProfileForm] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [passForm, setPassForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass,    setSavingPass]    = useState(false)

  const setP = (k) => (e) => setProfileForm((p) => ({ ...p, [k]: e.target.value }))
  const setPw= (k) => (e) => setPassForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await userService.updateProfile(profileForm)
      const updated = await authService.me()
      setUser(updated)
      toast.success('Профиль обновлён')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка при обновлении')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passForm.new_password !== passForm.confirm_password) {
      toast.error('Пароли не совпадают')
      return
    }
    if (passForm.new_password.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов')
      return
    }
    setSavingPass(true)
    try {
      await userService.changePassword({
        old_password: passForm.old_password,
        new_password: passForm.new_password,
      })
      toast.success('Пароль изменён')
      setPassForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Неверный старый пароль')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="page-title mb-6">Профиль</h1>

        <div className="flex flex-col gap-6">
          {/* Profile Info */}
          <div className="card p-6">
            <h2 className="section-title mb-4">Информация</h2>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <Input
                label="Имя"
                placeholder="Ваше имя"
                value={profileForm.name}
                onChange={setP('name')}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="email@example.com"
                value={profileForm.email}
                onChange={setP('email')}
              />
              <Input
                label="Телефон"
                type="tel"
                placeholder="+7 777 123 45 67"
                value={profileForm.phone}
                onChange={setP('phone')}
                hint={user?.phone ? `Текущий: ${formatPhone(user.phone)}` : ''}
              />

              <div className="bg-sky-50 rounded-xl p-3 text-xs text-slate-600">
                <strong>Роль:</strong> {user?.role === 'client' ? 'Клиент' : user?.role === 'owner' ? 'Владелец мойки' : user?.role}
              </div>

              <Button type="submit" loading={savingProfile} className="self-start">
                Сохранить
              </Button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card p-6">
            <h2 className="section-title mb-4">Смена пароля</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <Input
                label="Старый пароль"
                type="password"
                placeholder="••••••••"
                value={passForm.old_password}
                onChange={setPw('old_password')}
                required
              />
              <Input
                label="Новый пароль"
                type="password"
                placeholder="Минимум 6 символов"
                value={passForm.new_password}
                onChange={setPw('new_password')}
                required
                minLength={6}
              />
              <Input
                label="Подтвердите новый пароль"
                type="password"
                placeholder="••••••••"
                value={passForm.confirm_password}
                onChange={setPw('confirm_password')}
                required
              />
              <Button type="submit" loading={savingPass} className="self-start">
                Изменить пароль
              </Button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}