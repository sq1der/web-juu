import { useState, useEffect } from 'react'

/**
 * Returns { coords: {lat, lng} | null, loading, error }
 * Automatically requests browser geolocation on mount.
 */
export function useGeolocation() {
  const [coords,  setCoords]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Геолокация недоступна в вашем браузере')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      (err) => {
        setError('Не удалось получить геолокацию')
        setLoading(false)
        console.warn('[Geolocation]', err.message)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  return { coords, loading, error }
}