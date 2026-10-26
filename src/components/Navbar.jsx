import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Recipes', to: '/recipes' },
  { label: 'Journal', to: '/journal' },
  { label: 'Favorites', to: '/favorites' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { profile, signOut, user } = useAuth()

  function closeMenu() {
    setMenuOpen(false)
  }

  async function handleSignOut() {
    setSignOutError('')
    setIsSigningOut(true)

    try {
      await signOut()
      closeMenu()
    } catch (error) {
      setSignOutError(error.message || 'Unable to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link aria-label="Olive & Thyme home" className="brand" to="/">
          Olive & Thyme
          <small>Good food, gently made</small>
        </Link>
        <nav
          aria-label="Main navigation"
          className={`main-nav${menuOpen ? ' is-open' : ''}`}
        >
          {navItems.map((item) => (
            <NavLink
              end={item.to === '/'}
              key={item.to}
              onClick={closeMenu}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
          {user && (
            <NavLink onClick={closeMenu} to="/account">
              Account
            </NavLink>
          )}
          {profile?.role === 'admin' && (
            <NavLink onClick={closeMenu} to="/admin">
              Studio
            </NavLink>
          )}
          {user ? (
            <button
              className="mobile-auth-link"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          ) : (
            <Link className="mobile-auth-link" onClick={closeMenu} to="/login">
              Sign in
            </Link>
          )}
        </nav>
        <div className="nav-actions">
          {user ? (
            <button
              className="nav-login"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          ) : (
            <>
              <Link className="nav-login" onClick={closeMenu} to="/login">
                Sign in
              </Link>
              <Link className="button" onClick={closeMenu} to="/register">
                Join the table
              </Link>
            </>
          )}
          {signOutError && (
            <span className="nav-error" role="alert">
              {signOutError}
            </span>
          )}
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="m6 6 12 12M18 6 6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.7"
                />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
