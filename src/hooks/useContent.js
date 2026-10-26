import { useCallback, useEffect, useState } from 'react'
import {
  getAdminContent,
  getPublishedFeed,
  getPublishedPost,
  getPublishedPosts,
  getPublishedRecipe,
  getPublishedRecipes,
} from '../lib/content.js'

function useContentRequest(request, requestKey) {
  const [result, setResult] = useState({
    key: null,
    data: null,
    error: null,
  })

  useEffect(() => {
    let isActive = true

    request()
      .then((data) => {
        if (isActive) setResult({ key: requestKey, data, error: null })
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error(`[content] ${requestKey} request failed`, {
            name: error?.name,
            message: error?.message,
            code: error?.code,
            status: error?.status,
            statusCode: error?.statusCode,
          })
        }
        if (isActive) {
          setResult({
            key: requestKey,
            data: null,
            error: error.message || 'Unable to load content.',
          })
        }
      })

    return () => {
      isActive = false
    }
  }, [request, requestKey])

  const matches = result.key === requestKey

  return {
    data: matches ? result.data : null,
    error: matches ? result.error : null,
    isLoading: !matches,
  }
}

export function usePublishedFeed() {
  return useContentRequest(getPublishedFeed, 'feed')
}

export function usePublishedRecipes() {
  return useContentRequest(getPublishedRecipes, 'recipes')
}

export function usePublishedRecipe(slug) {
  const request = useCallback(() => getPublishedRecipe(slug), [slug])
  return useContentRequest(request, `recipe:${slug}`)
}

export function usePublishedPosts() {
  return useContentRequest(getPublishedPosts, 'posts')
}

export function usePublishedPost(slug) {
  const request = useCallback(() => getPublishedPost(slug), [slug])
  return useContentRequest(request, `post:${slug}`)
}

export function useAdminContent(reloadKey = 0) {
  const request = useCallback(() => getAdminContent(), [])
  return useContentRequest(request, `admin:${reloadKey}`)
}
