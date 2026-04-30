import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Этот параметр автоматически добавляет 'import React' туда, где он нужен
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    port: 5173,
    host: true
  }
})