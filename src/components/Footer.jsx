import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <Link className="brand footer-brand" to="/">
              Olive & Thyme
              <small>Good food, gently made</small>
            </Link>
            <p className="footer-copy">
              A little corner for seasonal cooking, well-loved recipes, and
              stories from around the table.
            </p>
          </div>
          <nav aria-label="Footer navigation" className="footer-links">
            <Link to="/recipes">Recipes</Link>
            <Link to="/journal">Journal</Link>
            <Link to="/favorites">Favorites</Link>
            <Link to="/admin">Studio preview</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Olive & Thyme</span>
          <span>Made for slower, happier meals.</span>
        </div>
      </div>
    </footer>
  )
}
