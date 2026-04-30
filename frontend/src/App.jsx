import React from 'react';
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Router from './router'
import ToastContainer from './components/ui/Toast'

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <Router />
        <ToastContainer />
      </AuthProvider>
    </AppProvider>
  )
}