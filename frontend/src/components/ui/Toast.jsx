import React from 'react';
import { useApp } from '../../context/AppContext'

const icons = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  error:   'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-orange-50 border-orange-200 text-orange-700',
  info:    'bg-primary-50 border-primary-200 text-primary-700',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useApp()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-up ${styles[t.type] || styles.info}`}
        >
          <span className="shrink-0 mt-0.5">{icons[t.type]}</span>
          <p className="text-sm font-medium flex-1">
            {typeof t.message === 'object' 
              ? (Array.isArray(t.message) 
              ? t.message.map(m => m.msg || JSON.stringify(m)).join(', ') 
              : (t.message.detail || JSON.stringify(t.message)))
                : t.message}
          </p>
          <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}