import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useFavorites } from '../context/useFavorites.js'

export default function FavoriteButton({ recipeId, recipeTitle, className = '' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    actionError,
    favoriteIds,
    isFavoriteLoading,
    pendingIds,
    toggleFavorite,
  } = useFavorites()
  const isFavorite = favoriteIds.includes(recipeId)
  const isPending = pendingIds.includes(recipeId)
  const message =
    actionError?.recipeId === recipeId ? actionError.message : ''

  function handleClick() {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    void toggleFavorite(recipeId)
  }

  return (
    <span className="favorite-control">
      <button
        aria-busy={isPending}
        aria-label={
          user
            ? isFavorite
              ? `Remove ${recipeTitle} from favorites`
              : `Add ${recipeTitle} to favorites`
            : `Sign in to save ${recipeTitle} to favorites`
        }
        aria-pressed={isFavorite}
        className={`favorite-button${isFavorite ? ' is-favorite' : ''}${className ? ` ${className}` : ''}`}
        disabled={isFavoriteLoading || isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending ? (
          <span aria-hidden="true" className="favorite-spinner" />
        ) : (
          <svg
            aria-hidden="true"
            fill={isFavorite ? 'currentColor' : 'none'}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.4 7.1c0 4.2-7.4 9-7.4 9s-7.4-4.8-7.4-9A3.8 3.8 0 0 1 10 5.2a3.8 3.8 0 0 1 7.4 1.9Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.4"
            />
          </svg>
        )}
      </button>
      {message && (
        <span className="favorite-error" role="alert">
          {message}
        </span>
      )}
    </span>
  )
}
