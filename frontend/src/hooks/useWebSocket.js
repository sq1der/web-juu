import { useEffect, useRef, useCallback } from 'react'
import { WS_BASE_URL } from '../utils/constants'

/**
 * useWebSocket — connects to a WS endpoint and fires onMessage callbacks.
 *
 * @param {string|null} path  — e.g. "/ws/booking/123" or "/ws/operator"
 * @param {Function}    onMessage — called with parsed JSON payload
 * @param {boolean}     enabled — set false to skip connecting
 */
export function useWebSocket(path, onMessage, enabled = true) {
  const wsRef        = useRef(null)
  const onMessageRef = useRef(onMessage)

  // Keep callback ref fresh without re-connecting
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  const connect = useCallback(() => {
    if (!path || !enabled) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const url = `${WS_BASE_URL}${path}?token=${token}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen    = () => console.log('[WS] connected:', path)
    ws.onclose   = () => console.log('[WS] closed:', path)
    ws.onerror   = (e) => console.error('[WS] error:', e)
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        onMessageRef.current?.(payload)
      } catch {
        onMessageRef.current?.(e.data)
      }
    }
  }, [path, enabled])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}