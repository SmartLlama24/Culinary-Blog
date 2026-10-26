import { Navigate, Outlet, useLocation } from 'react-router-dom'
import ErrorMessage from './ErrorMessage.jsx'
import LoadingState from './LoadingState.jsx'
import { useAuth } from '../context/useAuth.js'

export default function ProtectedRoute({ adminOnly = false }) {
  const location = useLocation()
  const {
    isLoading,
    isProfileLoading,
    profile,
    profileError,
    user,
  } = useAuth()

  if (isLoading) {
    return <LoadingState label="Checking your session…" />
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (!adminOnly) return <Outlet />

  if (isProfileLoading) {
    return <LoadingState label="Checking your access…" />
  }

  if (profileError) {
    return (
      <div className="container page-content page-top">
        <ErrorMessage>
          We couldn’t verify admin access: {profileError}
        </ErrorMessage>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container page-content page-top">
        <ErrorMessage>
          Your profile is unavailable. Apply the Supabase profile migration
          and try again.
        </ErrorMessage>
      </div>
    )
  }

  if (profile.role !== 'admin') {
    return (
      <section className="container not-found">
        <div className="page-heading">
          <span className="eyebrow">Members only</span>
          <h1>Admin access required.</h1>
          <p>Your account doesn’t have permission to open the kitchen studio.</p>
        </div>
      </section>
    )
  }

  return <Outlet />
}
