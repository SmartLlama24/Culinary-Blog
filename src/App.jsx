import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import LoadingState from './components/LoadingState.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'
import './App.css'

const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'))
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'))
const BlogPage = lazy(() => import('./pages/BlogPage.jsx'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage.jsx'))
const RecipesPage = lazy(() => import('./pages/RecipesPage.jsx'))

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <Suspense fallback={<LoadingState />}>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route index element={<HomePage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="recipes/:slug" element={<RecipeDetailPage />} />
                <Route path="journal" element={<BlogPage />} />
                <Route path="journal/:slug" element={<BlogPostPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="account" element={<AccountPage />} />
                  <Route path="favorites" element={<FavoritesPage />} />
                </Route>
                <Route path="login" element={<AuthPage mode="login" />} />
                <Route path="register" element={<AuthPage mode="register" />} />
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="admin" element={<AdminPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
