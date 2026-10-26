import { useState } from 'react'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EditorialCard from '../components/EditorialCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { usePublishedRecipes } from '../hooks/useContent.js'

export default function RecipesPage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const { data: recipes, error, isLoading } = usePublishedRecipes()
  const publishedRecipes = recipes ?? []
  const categories = [
    'All',
    ...new Set(
      publishedRecipes.map((recipe) => recipe.category).filter(Boolean),
    ),
  ]
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleRecipes = publishedRecipes.filter((recipe) => {
    const matchesCategory =
      category === 'All' || recipe.category === category
    const matchesSearch =
      !normalizedSearch ||
      [
        recipe.title,
        recipe.excerpt,
        recipe.category,
        ...recipe.recipe_ingredients.map(
          (ingredient) => ingredient.ingredient_name,
        ),
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })

  return (
    <>
      <div className="container page-top">
        <div className="page-heading">
          <span className="eyebrow">From our kitchen</span>
          <h1>Recipes for real life.</h1>
          <p>
            Seasonal, generous, and made to be cooked again. Browse the recipe
            box and find something good for today.
          </p>
        </div>
      </div>
      <section className="container page-content" aria-label="Recipe collection">
        {error ? (
          <ErrorMessage>We couldn’t load recipes: {error}</ErrorMessage>
        ) : isLoading ? (
          <LoadingState label="Gathering the recipe collection…" />
        ) : publishedRecipes.length === 0 ? (
          <div className="empty-state">
            <h2>No published recipes just yet.</h2>
            <p>Check back soon for something lovely from our kitchen.</p>
          </div>
        ) : (
          <>
            <label className="recipe-search">
              <span>Search recipes</span>
              <input
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or ingredient"
                type="search"
                value={search}
              />
            </label>
            <div aria-label="Filter recipes by category" className="filter-row">
              {categories.map((item) => (
                <button
                  aria-pressed={category === item}
                  className={`filter-chip${category === item ? ' selected' : ''}`}
                  key={item}
                  onClick={() => setCategory(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            {visibleRecipes.length === 0 ? (
              <div className="empty-state">
                <h2>No recipes found.</h2>
                <p>Try another search or select a different category.</p>
              </div>
            ) : (
              <div className="card-grid">
                {visibleRecipes.map((recipe) => (
                  <EditorialCard
                    item={{ ...recipe, content_type: 'recipe' }}
                    key={recipe.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
