import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './useAuth.js'
import { FavoritesContext } from './favoritesContext.js'
import { supabase, supabaseConfigError } from '../lib/supabaseClient.js'

const EMPTY_IDS = Object.freeze([])

export function FavoritesProvider({ children }) {
  const [favoritesState, setFavoritesState] = useState({
    userId: null,
    ids: [],
    error: '',
  })
  const [actionError, setActionError] = useState(null)
  const [pendingState, setPendingState] = useState({ userId: null, ids: [] })
  const pendingIdsRef = useRef(new Set())
  const generationRef = useRef(0)
  const { isLoading: isAuthLoading, user } = useAuth()
  const userId = user?.id ?? null
  const ownsFavorites = userId !== null && favoritesState.userId === userId
  const favoriteIds = ownsFavorites ? favoritesState.ids : EMPTY_IDS
  const loadError = ownsFavorites ? favoritesState.error : ''
  const pendingIds =
    pendingState.userId === userId ? pendingState.ids : EMPTY_IDS
  const isFavoriteLoading =
    isAuthLoading || (userId !== null && !ownsFavorites)

  useEffect(() => {
    let isActive = true
    generationRef.current += 1

    pendingIdsRef.current.clear()

    if (isAuthLoading) return () => { isActive = false }
    if (!userId) return () => { isActive = false }

    async function loadFavorites() {
      try {
        if (!supabase) throw new Error(supabaseConfigError)
        const { data, error } = await supabase
          .from('user_favorites')
          .select('recipe_id')
          .eq('user_id', userId)

        if (error) throw error
        if (isActive) {
          setFavoritesState({
            userId,
            ids: (data ?? []).map((favorite) => favorite.recipe_id),
            error: '',
          })
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[favorites] load failed', {
            message: error?.message,
            code: error?.code,
            status: error?.status,
          })
        }
        if (isActive) {
          setFavoritesState({
            userId,
            ids: [],
            error: error.message || 'Unable to load favorites.',
          })
        }
      }
    }

    loadFavorites()
    return () => { isActive = false }
  }, [isAuthLoading, userId])

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!userId) {
      setActionError({
        userId: null,
        recipeId,
        message: 'Sign in to save recipes to your favorites.',
      })
      return
    }
    if (pendingIdsRef.current.has(recipeId)) return
    if (!supabase) {
      setActionError({ userId, recipeId, message: supabaseConfigError })
      return
    }

    const wasFavorite =
      favoritesState.userId === userId &&
      favoritesState.ids.includes(recipeId)
    const generation = generationRef.current
    pendingIdsRef.current.add(recipeId)
    setPendingState((current) => ({
      userId,
      ids:
        current.userId === userId
          ? [...current.ids, recipeId]
          : [recipeId],
    }))
    setActionError(null)
    setFavoritesState((current) => ({
      userId,
      error: '',
      ids:
        current.userId === userId
          ? wasFavorite
            ? current.ids.filter((id) => id !== recipeId)
            : [...current.ids, recipeId]
          : wasFavorite
            ? []
            : [recipeId],
    }))

    try {
      const result = wasFavorite
        ? await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('recipe_id', recipeId)
        : await supabase
            .from('user_favorites')
            .upsert(
              { user_id: userId, recipe_id: recipeId },
              { onConflict: 'user_id,recipe_id', ignoreDuplicates: true },
            )

      if (result.error) throw result.error
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[favorites] update failed', {
          message: error?.message,
          code: error?.code,
          status: error?.status,
        })
      }
      if (generation === generationRef.current) {
        setFavoritesState((current) => ({
          ...current,
          ids:
            current.userId !== userId
              ? []
              : wasFavorite
                ? current.ids.includes(recipeId)
                  ? current.ids
                  : [...current.ids, recipeId]
                : current.ids.filter((id) => id !== recipeId),
        }))
        setActionError({
          userId,
          recipeId,
          message: error.message || 'Unable to update this favorite.',
        })
      }
    } finally {
      if (generation === generationRef.current) {
        pendingIdsRef.current.delete(recipeId)
        setPendingState((current) => ({
          ...current,
          ids:
            current.userId === userId
              ? current.ids.filter((id) => id !== recipeId)
              : current.ids,
        }))
      }
    }
  }, [favoritesState, userId])

  const value = useMemo(
    () => ({
      actionError: actionError?.userId === userId ? actionError : null,
      favoriteIds,
      isFavoriteLoading,
      loadError,
      pendingIds,
      toggleFavorite,
    }),
    [
      actionError,
      favoriteIds,
      isFavoriteLoading,
      loadError,
      pendingIds,
      toggleFavorite,
      userId,
    ],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}
