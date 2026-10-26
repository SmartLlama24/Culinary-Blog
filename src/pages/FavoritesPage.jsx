import { Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard.jsx'
import { useFavorites } from '../context/useFavorites.js'
import { recipes } from '../data/content.js'

export default function FavoritesPage() {
  const { favoriteIds, toggleFavorite } = useFavorites()
  const favoriteRecipes = recipes.filter((recipe) =>
    favoriteIds.includes(recipe.id),
  )

  return (
    <>
      <div className="container page-top">
        <div className="page-heading">
          <span className="eyebrow">Your recipe box</span>
          <h1>Saved for later.</h1>
          <p>
            Keep the recipes you love close at hand. Favorites are still held
            only in this browser session; account sync is not connected yet.
          </p>
        </div>
      </div>
      <section className="container page-content" aria-label="Favorite recipes">
        {favoriteRecipes.length > 0 ? (
          <div className="card-grid">
            {favoriteRecipes.map((recipe) => (
              <RecipeCard
                isFavorite
                key={recipe.id}
                onToggleFavorite={toggleFavorite}
                recipe={recipe}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Your recipe box is waiting.</h2>
            <p>
              Tap the heart on a recipe to save it here while you browse.
            </p>
            <Link className="button" to="/recipes">
              Explore recipes
            </Link>
          </div>
        )}
      </section>
    </>
  )
}
