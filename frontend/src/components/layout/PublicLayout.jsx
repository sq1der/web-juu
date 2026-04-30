import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'

export default function PublicLayout({ children }) {
  const { isLoggedIn, user, logout, isOwner } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-sky-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-sky-400 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg text-slate-900">WashBook</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" label="Мойки" location={location} />
            {isLoggedIn && !isOwner && (
              <>
                <NavLink to="/bookings"  label="Мои брони" location={location} />
                <NavLink to="/favorites" label="Избранное"  location={location} />
              </>
            )}
            {isOwner && (
              <NavLink to="/operator/dashboard" label="Дашборд оператора" location={location} />
            )}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link to="/profile">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-sky-50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-600">
                        {user?.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
                  </div>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>Выйти</Button>
              </>
            ) : (
              <>
                <Button variant="ghost"     size="sm" onClick={() => navigate('/login')}>Войти</Button>
                <Button variant="primary"   size="sm" onClick={() => navigate('/register')}>Регистрация</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-sky-100 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 WashBook</span>
          <span>Сервис бронирования автомоек</span>
        </div>
      </footer>
    </div>
  )
}

function NavLink({ to, label, location }) {
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
        ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      {label}
    </Link>
  )
}