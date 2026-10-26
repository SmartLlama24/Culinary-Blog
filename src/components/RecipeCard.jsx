import { Link } from 'react-router-dom'

function HeartIcon({ filled }) {
  return (
    <svg
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
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
  )
}

export default function RecipeCard({
  recipe,
  isFavorite = false,
  onToggleFavorite,
  showFavorite = true,
}) {
  const totalMinutes =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)
  const servings =
    recipe.servings_label ??
    (typeof recipe.servings === 'number'
      ? `Serves ${recipe.servings}`
      : recipe.servings)

  return (
    <article className="recipe-card">
      <Link
        aria-label={`View recipe: ${recipe.title}`}
        className="card-image-link"
        to={`/recipes/${recipe.slug}`}
      >
        <img
          src={recipe.image_url ?? recipe.image}
          alt={recipe.image_alt ?? recipe.imageAlt}
          loading="lazy"
        />
        <span className="card-category">{recipe.category}</span>
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{recipe.time ?? `${totalMinutes} min`}</span>
          <span className="dot" aria-hidden="true" />
          <span>{servings}</span>
        </div>
        <Link className="card-title" to={`/recipes/${recipe.slug}`}>
          {recipe.title}
        </Link>
        <div className="card-footer">
          <span>{recipe.date ?? recipe.published_at}</span>
          {showFavorite && (
            <button
              aria-label={
                isFavorite
                  ? `Remove ${recipe.title} from favorites`
                  : `Add ${recipe.title} to favorites`
              }
              aria-pressed={isFavorite}
              className={`favorite-button${isFavorite ? ' is-favorite' : ''}`}
              onClick={() => onToggleFavorite?.(recipe.id)}
              type="button"
            >
              <HeartIcon filled={isFavorite} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
