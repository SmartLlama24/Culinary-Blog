import { useMemo, useState } from 'react'
import { FavoritesContext } from './favoritesContext.js'

export function FavoritesProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState([])

  function toggleFavorite(id) {
    setFavoriteIds((current) =>
      current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id],
    )
  }

  const value = useMemo(
    () => ({ favoriteIds, toggleFavorite }),
    [favoriteIds],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}
