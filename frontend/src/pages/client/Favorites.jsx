import { useState, useEffect } from 'react'
import PublicLayout from '../../components/layout/PublicLayout'
import CarwashCard from '../../components/carwash/CarwashCard'
import Spinner from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/Helpers'
import { favoriteService } from '../../api/reviewService'
import { useApp } from '../../context/AppContext'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'

export default function Favorites() {
  const { toast }       = useApp()
  const [favorites, setFavorites] = useState([])
  const [loading,   setLoading]   = useState(true)

  const fetchFavorites = async () => {
    try {
      const data = await favoriteService.list()
      setFavorites(Array.isArray(data) ? data : data.items || [])
    } catch { toast.error('Не удалось загрузить избранное') }
    finally  { setLoading(false) }
  }

  useEffect(() => { fetchFavorites() }, [])

  const handleToggleFavorite = async (carwashId) => {
    try {
      await favoriteService.remove(carwashId)
      setFavorites((prev) => prev.filter((f) => f.id !== carwashId))
      toast.success('Удалено из избранного')
    } catch { toast.error('Ошибка') }
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="page-title mb-6">Избранное</h1>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : favorites.length === 0 ? (
          <EmptyState
            icon="❤️"
            title="Нет избранных моек"
            description="Добавьте мойки в избранное для быстрого доступа"
            action={<Link to="/"><Button>Найти мойку</Button></Link>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((cw) => (
              <CarwashCard
                key={cw.id}
                carwash={cw}
                isFavorite={true}
                onFavoriteToggle={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}