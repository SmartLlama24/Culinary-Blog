import { Link, useParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import LoadingState from '../components/LoadingState.jsx'
import CommentsSection from '../components/CommentsSection.jsx'
import { usePublishedRecipe } from '../hooks/useContent.js'
import { formatContentDate, formatRecipeTime } from '../lib/content.js'

export default function RecipeDetailPage() {
  const { slug } = useParams()
  const { data: recipe, error, isLoading } = usePublishedRecipe(slug)

  if (isLoading) {
    return (
      <section className="container detail-layout">
        <LoadingState label="Gathering the recipe…" />
      </section>
    )
  }

  if (error || !recipe) {
    return (
      <section className="container page-content page-top">
        {error ? (
          <ErrorMessage>We couldn’t load this recipe: {error}</ErrorMessage>
        ) : (
          <div className="empty-state">
            <h2>We couldn’t find that recipe.</h2>
            <p>It may be unpublished or no longer available.</p>
          </div>
        )}
        <p className="back-link">
          <Link className="text-link" to="/recipes">
            Back to all recipes
          </Link>
        </p>
      </section>
    )
  }

  return (
    <article className="container detail-layout">
      <div className="detail-main">
        <span className="eyebrow">{recipe.category}</span>
        <h1 className="detail-title">{recipe.title}</h1>
        <p className="detail-lede">{recipe.excerpt}</p>
        <div className="detail-meta">
          <span>
            {formatContentDate(recipe.published_at)}
          </span>
          <span>
            Prep {formatRecipeTime(recipe.prep_time_minutes)} · Cook{' '}
            {formatRecipeTime(recipe.cook_time_minutes)}
          </span>
          <span>Serves {recipe.servings}</span>
        </div>
        <FavoriteButton
          className="favorite-detail-button"
          recipeId={recipe.id}
          recipeTitle={recipe.title}
        />
        {recipe.cover_image_url && (
          <img
            alt={recipe.cover_image_alt || recipe.title}
            className="detail-hero"
            src={recipe.cover_image_url}
          />
        )}
        <div className="detail-content">
          <p>{recipe.excerpt}</p>
          <h2>How to make it</h2>
          <ol>
            {recipe.recipe_instructions.map((step) => (
              <li key={step.id}>{step.instruction}</li>
            ))}
          </ol>
        </div>
        <CommentsSection contentId={recipe.id} contentType="recipe" />
      </div>
      <aside className="detail-sidebar">
        <h2>What you’ll need</h2>
        {recipe.recipe_ingredients.length > 0 ? (
          <ul className="ingredient-list">
            {recipe.recipe_ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                <span>
                  {ingredient.ingredient_name}
                  {ingredient.notes ? `, ${ingredient.notes}` : ''}
                </span>
                <span>
                  {[ingredient.quantity, ingredient.unit]
                    .filter((value) => value !== null && value !== '')
                    .join(' ')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-lede">Ingredients haven’t been added yet.</p>
        )}
      </aside>
    </article>
  )
}
