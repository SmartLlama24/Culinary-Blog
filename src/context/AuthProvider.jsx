import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigError } from '../lib/supabaseClient.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [authError, setAuthError] = useState(supabaseConfigError)
  const [profileState, setProfileState] = useState({
    userId: null,
    data: null,
    error: null,
  })
  const user = session?.user ?? null
  const userId = user?.id ?? null
  const hasCurrentProfile = profileState.userId === userId && userId !== null
  const profile = hasCurrentProfile ? profileState.data : null
  const profileError = hasCurrentProfile ? profileState.error : null
  const isProfileLoading = Boolean(userId && !hasCurrentProfile)

  useEffect(() => {
    if (!supabase) return undefined

    let isActive = true
    let receivedAuthEvent = false
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true
      setSession(nextSession)
      setAuthError(null)
      setIsLoading(false)
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive || receivedAuthEvent) return

        if (error) {
          setAuthError(error.message)
        } else {
          setSession(data.session)
        }
        setIsLoading(false)
      })
      .catch((error) => {
        if (!isActive || receivedAuthEvent) return
        setAuthError(error.message || 'Unable to restore your session.')
        setIsLoading(false)
      })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isActive = true

    if (supabase && userId) {
      async function loadProfile() {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, role')
            .eq('id', userId)
            .maybeSingle()

          if (!isActive) return
          setProfileState({
            userId,
            data: error ? null : data,
            error: error?.message ?? null,
          })
        } catch (error) {
          if (!isActive) return
          setProfileState({
            userId,
            data: null,
            error: error.message || 'Unable to load your profile.',
          })
        }
      }

      loadProfile()
    }

    return () => {
      isActive = false
    }
  }, [userId])

  async function signUp({ email, password, displayName }) {
    if (!supabase) throw new Error(supabaseConfigError)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : {},
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) throw error
    return data
  }

  async function signIn({ email, password }) {
    if (!supabase) throw new Error(supabaseConfigError)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  async function signOut() {
    if (!supabase) throw new Error(supabaseConfigError)

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = useMemo(
    () => ({
      authError,
      isLoading,
      isProfileLoading,
      profile,
      profileError,
      session,
      signIn,
      signOut,
      signUp,
      user,
    }),
    [
      authError,
      isLoading,
      isProfileLoading,
      profile,
      profileError,
      session,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
