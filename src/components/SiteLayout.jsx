import { Outlet } from 'react-router-dom'
import './SkipLink.css'
import Footer from './Footer.jsx'
import Navbar from './Navbar.jsx'

export default function SiteLayout() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
