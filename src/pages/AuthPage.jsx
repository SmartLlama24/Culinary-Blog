import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useAuth } from '../context/useAuth.js'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { authError, isLoading, signIn, signUp } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    try {
      if (isRegister) {
        const data = await signUp({
          email,
          password,
          displayName: String(formData.get('displayName') ?? '').trim(),
        })

        if (data.session) {
          navigate('/favorites', { replace: true })
        } else {
          setSuccessMessage(
            'If this address can be registered, check your inbox for a confirmation link.',
          )
        }
      } else {
        await signIn({ email, password })
        const destination = location.state?.from
        navigate(
          destination
            ? `${destination.pathname}${destination.search}${destination.hash}`
            : '/favorites',
          { replace: true },
        )
      }
    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <LoadingState label="Checking your session…" />
  }

  return (
    <section className="container page-content page-top">
      <div className="auth-panel">
        <span className="eyebrow">Pull up a chair</span>
        <h1>{isRegister ? 'Join the table.' : 'Welcome back.'}</h1>
        <p>
          {isRegister
            ? 'Create a place for the recipes you want to come back to.'
            : 'Sign in to revisit your saved recipes and notes.'}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              Your name
              <input
                autoComplete="name"
                maxLength={80}
                name="displayName"
                placeholder="Jamie Cook"
              />
            </label>
          )}
          <label>
            Email address
            <input
              autoComplete="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              name="password"
              minLength={6}
              placeholder="At least 6 characters"
              required
              type="password"
            />
          </label>
          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? 'Please wait…'
              : isRegister
                ? 'Create an account'
                : 'Sign in'}
          </button>
        </form>
        {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        {authError && <ErrorMessage>{authError}</ErrorMessage>}
        {successMessage && (
          <div className="notice" role="status">
            {successMessage}
          </div>
        )}
        <p className="auth-switch">
          {isRegister ? 'Already have a seat?' : 'New around here?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </section>
  )
}
