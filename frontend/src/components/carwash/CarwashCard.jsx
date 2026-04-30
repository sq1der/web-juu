import { Link } from 'react-router-dom'
import { StarRating } from '../ui/Badge'

export default function CarwashCard({ carwash, onFavoriteToggle, isFavorite }) {
  return (
    <div className="card-hover p-5 flex flex-col gap-3 cursor-pointer group">
      <Link to={`/carwashes/${carwash.id}`} className="block">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors truncate">
              {carwash.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{carwash.address}</p>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StarRating value={carwash.rating} />
            <span className="text-xs text-slate-400">{carwash.reviews_count} отзывов</span>
          </div>
        </div>

        {/* Working hours */}
        {carwash.working_hours && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <WorkingHoursToday hours={carwash.working_hours} />
          </div>
        )}

        {/* Distance */}
        {carwash.distance_km !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {carwash.distance_km < 1
              ? `${Math.round(carwash.distance_km * 1000)} м`
              : `${carwash.distance_km.toFixed(1)} км`}
          </div>
        )}
      </Link>

      {/* Favorite button */}
      {onFavoriteToggle && (
        <button
          onClick={(e) => { e.preventDefault(); onFavoriteToggle(carwash.id) }}
          className={`self-end flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
            ${isFavorite ? 'text-rose-500 bg-rose-50 hover:bg-rose-100' : 'text-slate-400 hover:bg-slate-50 hover:text-rose-400'}`}
        >
          <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {isFavorite ? 'В избранном' : 'В избранное'}
        </button>
      )}
    </div>
  )
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_NAMES = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' }

function WorkingHoursToday({ hours }) {
  if (!hours) return null
  const dayKey  = DAY_KEYS[new Date().getDay()]
  const todayHr = hours[dayKey]
  if (!todayHr) return <span>Закрыто сегодня</span>
  return <span>{DAY_NAMES[dayKey]}: {todayHr}</span>
}