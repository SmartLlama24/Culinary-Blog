import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabaseClient.js'

export default function AccountPage() {
  const {
    isProfileLoading,
    profile,
    profileError,
    refreshProfile,
    signOut,
    user,
  } = useAuth()
  const navigate = useNavigate()
  const [editedName, setEditedName] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setNotice('')

    const normalizedName = (editedName ?? profile?.display_name ?? '').trim()
    if (!normalizedName) {
      setErrorMessage('Enter a display name.')
      return
    }
    if (normalizedName.length > 80) {
      setErrorMessage('Display names must be 80 characters or fewer.')
      return
    }
    if (!supabase) {
      setErrorMessage('Supabase is not configured.')
      return
    }

    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: normalizedName })
        .eq('id', user.id)
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('Your profile was not found or could not be updated.')
      await refreshProfile()
      setEditedName(null)
      setNotice('Your display name has been updated.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update your account.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSignOut() {
    setErrorMessage('')
    setNotice('')
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isProfileLoading) {
    return (
      <section className="container page-content page-top">
        <LoadingState label="Loading your account…" />
      </section>
    )
  }

  if (profileError) {
    return (
      <section className="container page-content page-top">
        <ErrorMessage>We couldn’t load your profile: {profileError}</ErrorMessage>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="container page-content page-top">
        <div className="empty-state">
          <h1>Your profile is unavailable.</h1>
          <p>
            The profile record may be missing. Ask the site administrator to
            check the profile signup trigger and database migration.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="container page-content page-top">
      <div className="account-panel">
        <span className="eyebrow">Your place at the table</span>
        <h1>Account details</h1>
        <dl className="account-details">
          <div>
            <dt>Email address</dt>
            <dd>{user.email || 'No email address is available.'}</dd>
          </div>
        </dl>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="account-display-name">
            Display name
            <input
              autoComplete="name"
              id="account-display-name"
              maxLength={80}
              onChange={(event) => setEditedName(event.target.value)}
              required
              value={editedName ?? profile.display_name ?? ''}
            />
          </label>
          <button className="button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving…' : 'Save display name'}
          </button>
        </form>
        {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        <div className="account-signout">
          <button
            className="text-button"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </section>
  )
}
