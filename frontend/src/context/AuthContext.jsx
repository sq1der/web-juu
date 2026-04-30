import React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../api/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)  // initial load
  const [error,   setError]   = useState(null)

  // Hydrate user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }

    authService.me()
      .then(setUser)
      .catch(() => {
        authService.logout()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials) => {
    setError(null)
    try {
      await authService.login(credentials)
      const me = await authService.me()
      setUser(me)
      return me
    } catch (err) {
      const msg = err.response?.data?.detail || 'Ошибка входа'
      setError(msg)
      throw err
    }
  }, [])

  const register = useCallback(async (payload) => {
    setError(null)
    try {
      await authService.register(payload)
      // Auto-login after register
      await authService.login({ identifier: payload.email || payload.phone, password: payload.password })
      const me = await authService.me()
      setUser(me)
      return me
    } catch (err) {
      const msg = err.response?.data?.detail || 'Ошибка регистрации'
      setError(msg)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  const isClient   = user?.role === 'client'
  const isOwner    = user?.role === 'owner'
  const isAdmin    = user?.role === 'admin'
  const isLoggedIn = !!user

  return (
    <AuthContext.Provider value={{
      user, loading, error, isLoggedIn,
      isClient, isOwner, isAdmin,
      login, register, logout,
      setUser, setError,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}