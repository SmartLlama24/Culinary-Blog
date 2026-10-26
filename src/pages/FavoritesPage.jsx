import { Link } from 'react-router-dom'
import EditorialCard from '../components/EditorialCard.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useFavorites } from '../context/useFavorites.js'
import { useFavoriteRecipes } from '../hooks/useContent.js'

export default function FavoritesPage() {
  const {
    actionError,
    favoriteIds,
    isFavoriteLoading,
    loadError: favoritesError,
    pendingIds,
    toggleFavorite,
  } = useFavorites()
  const {
    data: recipes,
    error: recipesError,
    isLoading: areRecipesLoading,
  } = useFavoriteRecipes(favoriteIds)
  const favoriteRecipes = (recipes ?? []).filter((recipe) =>
    favoriteIds.includes(recipe.id),
  )
  const availableIds = new Set(favoriteRecipes.map((recipe) => recipe.id))
  const unavailableIds = favoriteIds.filter((id) => !availableIds.has(id))
  const error = favoritesError || recipesError

  return (
    <>
      <div className="container page-top">
        <div className="page-heading">
          <span className="eyebrow">Your recipe box</span>
          <h1>Saved for later.</h1>
          <p>
            Keep the recipes you love close at hand, ready whenever you are.
          </p>
        </div>
      </div>
      <section className="container page-content" aria-label="Favorite recipes">
        {error ? (
          <ErrorMessage>
            We couldn’t load your favorites: {error}
          </ErrorMessage>
        ) : isFavoriteLoading ||
          (areRecipesLoading && favoriteRecipes.length === 0) ? (
          <LoadingState label="Gathering your saved recipes…" />
        ) : favoriteRecipes.length > 0 ? (
          <>
            <div className="card-grid">
              {favoriteRecipes.map((recipe) => (
                <EditorialCard
                  item={recipe}
                  key={recipe.id}
                />
              ))}
            </div>
            {unavailableIds.length > 0 && (
              <UnavailableFavorites
                ids={unavailableIds}
                actionError={actionError}
                pendingIds={pendingIds}
                onRemove={toggleFavorite}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2>
              {favoriteIds.length > 0
                ? 'Some saved recipes are no longer available.'
                : 'Your recipe box is waiting.'}
            </h2>
            <p>
              {favoriteIds.length > 0
                ? 'Unpublished or removed recipes are hidden from your favorites.'
                : 'Tap the heart on a recipe to save it here while you browse.'}
            </p>
            {unavailableIds.length > 0 && (
              <UnavailableFavorites
                ids={unavailableIds}
                actionError={actionError}
                pendingIds={pendingIds}
                onRemove={toggleFavorite}
              />
            )}
            <Link className="button" to="/recipes">
              Explore recipes
            </Link>
          </div>
        )}
      </section>
    </>
  )
}

function UnavailableFavorites({
  actionError,
  ids,
  pendingIds,
  onRemove,
}) {
  return (
    <div className="unavailable-favorites">
      <p>
        These saved recipes are unpublished or were removed. You can remove
        their saved entries here.
      </p>
      {ids.map((id, index) => (
        <div className="unavailable-favorite-item" key={id}>
          <button
            className="button button-outline"
            disabled={pendingIds.includes(id)}
            onClick={() => void onRemove(id)}
            type="button"
          >
            {pendingIds.includes(id)
              ? 'Removing…'
              : `Remove unavailable recipe ${index + 1}`}
          </button>
          {actionError?.recipeId === id && (
            <p className="favorite-error-inline" role="alert">
              {actionError.message}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
