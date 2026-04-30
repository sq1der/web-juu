import { useState, useEffect, useCallback } from 'react'
import PublicLayout from '../../components/layout/PublicLayout'
import CarwashCard from '../../components/carwash/CarwashCard'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/Helpers'
import { useGeolocation } from '../../hooks/useGeolocation'
import { carwashService } from '../../api/carwashService'
import { favoriteService } from '../../api/reviewService'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { DEFAULT_SEARCH_RADIUS } from '../../utils/constants'

export default function Home() {
  const { coords, loading: geoLoading } = useGeolocation()
  const { isLoggedIn, isClient }        = useAuth()
  const { toast }                        = useApp()

  const [carwashes,  setCarwashes]  = useState([])
  const [favorites,  setFavorites]  = useState(new Set())
  const [loading,    setLoading]    = useState(false)
  const [ratingMin,  setRatingMin]  = useState('')
  const [radius,     setRadius]     = useState(DEFAULT_SEARCH_RADIUS)
  const [manualLat,  setManualLat]  = useState('')
  const [manualLng,  setManualLng]  = useState('')
  const [searched,   setSearched]   = useState(false)

  // Load favorites
  useEffect(() => {
    if (!isClient) return
    favoriteService.list()
      .then((data) => setFavorites(new Set(data.map((f) => f.id))))
      .catch(() => {})
  }, [isClient])

  const search = useCallback(async (customCoords) => {
    const searchCoords = customCoords || coords
    if (!searchCoords) return

    setLoading(true)
    try {
      const params = {
        lat:    searchCoords.lat,
        lng:    searchCoords.lng,
        radius: radius,
        page:   1,
        limit:  20,
      }
      if (ratingMin) params.rating_min = parseFloat(ratingMin)

      const data = await carwashService.search(params)
      setCarwashes(Array.isArray(data) ? data : data.items || [])
      setSearched(true)
    } catch {
      toast.error('Ошибка при поиске моек')
    } finally {
      setLoading(false)
    }
  }, [coords, radius, ratingMin, toast])

  // Auto-search when geolocation available
  useEffect(() => {
    if (coords && !searched) search()
  }, [coords, searched, search])

  const handleManualSearch = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) return toast.error('Введите корректные координаты')
    search({ lat, lng })
  }

  const toggleFavorite = async (carwashId) => {
    if (!isLoggedIn) { toast.info('Войдите в аккаунт для добавления в избранное'); return }
    const isFav = favorites.has(carwashId)
    try {
      if (isFav) {
        await favoriteService.remove(carwashId)
        setFavorites((prev) => { const s = new Set(prev); s.delete(carwashId); return s })
      } else {
        await favoriteService.add(carwashId)
        setFavorites((prev) => new Set([...prev, carwashId]))
      }
    } catch {
      toast.error('Не удалось обновить избранное')
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-slate-900 mb-3">
            Найдите мойку рядом
          </h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Выбирайте, бронируйте и следите за статусом в реальном времени
          </p>
        </div>

        {/* Search Controls */}
        <div className="card p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Радиус поиска"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              {[1, 2, 5, 10, 20, 50].map((r) => (
                <option key={r} value={r}>{r} км</option>
              ))}
            </Select>

            <Select
              label="Мин. рейтинг"
              value={ratingMin}
              onChange={(e) => setRatingMin(e.target.value)}
            >
              <option value="">Любой</option>
              {[3, 4, 4.5].map((r) => (
                <option key={r} value={r}>{r}★+</option>
              ))}
            </Select>

            <div className="md:col-span-2 flex items-end">
              <Button
                className="w-full"
                onClick={() => search()}
                loading={loading}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                }
              >
                {geoLoading ? 'Определяю геолокацию...' : 'Найти рядом'}
              </Button>
            </div>
          </div>

          {/* Manual coordinates */}
          <details className="mt-3">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
              Указать координаты вручную
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Input placeholder="Широта (lat)" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
              <Input placeholder="Долгота (lng)" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
              <Button variant="secondary" onClick={handleManualSearch}>Поиск</Button>
            </div>
          </details>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : searched && carwashes.length === 0 ? (
          <EmptyState
            icon="🚿"
            title="Мойки не найдены"
            description="Попробуйте увеличить радиус поиска или изменить фильтры"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {carwashes.map((cw) => (
              <CarwashCard
                key={cw.id}
                carwash={cw}
                isFavorite={favorites.has(cw.id)}
                onFavoriteToggle={isClient ? toggleFavorite : null}
              />
            ))}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-lg">Разрешите доступ к геолокации или введите координаты</p>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}